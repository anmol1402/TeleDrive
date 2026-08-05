const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');
const aiService = require('./services/aiService');
const bigInt = require('big-integer');
require('dotenv').config();

const apiId = parseInt(process.env.API_ID || "0");
const apiHash = process.env.API_HASH || "";
let sessionString = process.env.SESSION_STRING || '';
let client;
let phoneCodeHash = '';
let onNewMessageCallback = null;

function withTimeout(promise, timeoutMs, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

let clientPromise = null;

async function ensureClient() {
    if (!client) {
        if (!clientPromise) {
            clientPromise = connectClient().finally(() => { clientPromise = null; });
        }
        await clientPromise;
    }
    if (!client) throw new Error('Client not initialized. Check API_ID and API_HASH.');
    
    // Check disconnected state safely without triggering concurrent reconnects
    if (client.disconnected && !clientPromise) {
        console.log("Client disconnected, reconnecting...");
        clientPromise = client.connect().finally(() => { clientPromise = null; });
        await clientPromise;
    } else if (clientPromise) {
        await clientPromise;
    }
    
    return client;
}

function setOnNewMessageCallback(cb) {
    onNewMessageCallback = cb;
}

async function connectClient() {
    if (!apiId || !apiHash) {
        console.warn("API_ID and API_HASH are missing in .env. Please configure them.");
        return;
    }
    const session = new StringSession(sessionString);
    client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });
    
    // Connect to Telegram servers. Does not force login.
    try {
        await withTimeout(client.connect(), 15000, 'Timed out connecting to Telegram. Check your network and credentials.');
        console.log('Telegram client connected.');
    } catch (error) {
        client = undefined;
        throw error;
    }
    
    const { NewMessage } = require('telegram/events');
    client.addEventHandler(async (event) => {
        if (onNewMessageCallback) {
            onNewMessageCallback();
        }
    }, new NewMessage({ incoming: true })); // Listen to all incoming messages (including Saved Messages sync)
}

async function sendCode(phoneNumber) {
    await ensureClient();
    
    const result = await withTimeout(client.sendCode(
        {
            apiId,
            apiHash,
        },
        phoneNumber
    ), 15000, 'Timed out sending the Telegram verification code.');
    phoneCodeHash = result.phoneCodeHash;
    return result;
}

async function login(phoneNumber, code) {
    await ensureClient();
    await withTimeout(client.invoke(
        new Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash,
            phoneCode: code,
        })
    ), 15000, 'Timed out verifying the Telegram code.');
    
    const newSession = client.session.save();
    // Update .env with the new session to persist across restarts
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent.includes('SESSION_STRING=')) {
        envContent = envContent.replace(/SESSION_STRING=.*/, `SESSION_STRING=${newSession}`);
    } else {
        envContent += `\nSESSION_STRING=${newSession}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    sessionString = newSession;
    
    return { session: newSession };
}

async function getUser() {
    try {
        await ensureClient();
        const me = await withTimeout(client.getMe(), 10000, 'Timed out getting the Telegram user.');
        return {
            id: me.id,
            firstName: me.firstName,
            lastName: me.lastName,
            username: me.username,
            phone: me.phone,
            hasProfilePhoto: !!me.photo
        };
    } catch (error) {
        return null;
    }
}

async function getProfilePicture() {
    try {
        await ensureClient();
        const buffer = await withTimeout(client.downloadProfilePhoto('me'), 10000, 'Timed out getting the profile picture.');
        return buffer; // Returns a Buffer containing the image data
    } catch (error) {
        return null;
    }
}

async function uploadFile(fileData, folder = '/', onProgress = null) {
    await ensureClient();
    const originalPath = fileData.path;
    const fileName = fileData.originalname;
    
    // Check for duplicates
    const hash = await aiService.generateFileHash(originalPath);
    const allFiles = await fetchFiles();
    const existing = allFiles.find(f => f.hash === hash && !f.trashed);
    
    if (existing) {
        fs.unlinkSync(originalPath);
        return { duplicate: true, file: existing };
    }

    // AI Processing
    const extractedText = await aiService.extractText(fileData, originalPath);
    const aiMetadata = await aiService.processFileMetadata(fileName, extractedText);

    const metadata = JSON.stringify({
        filename: aiMetadata.suggestedName || fileName,
        folder,
        category: aiMetadata.category || 'Uncategorized',
        size: fileData.size,
        mimetype: fileData.mimetype,
        hash,
        uploadedAt: new Date().toISOString()
    });

    // Rename for Telegram
    const newPath = originalPath + '_' + fileName;
    fs.renameSync(originalPath, newPath);

    // Upload to Telegram
    const result = await client.sendFile('me', {
        file: newPath,
        caption: metadata,
        workers: 16,
        forceDocument: true,
        progressCallback: (progress, ...args) => {
            console.log('progressCallback:', progress, args);
            if (onProgress) {
                // Determine if progress is a float (0 to 1) or bytes
                let loaded;
                if (progress <= 1) {
                    loaded = Math.round(progress * fileData.size);
                } else {
                    loaded = progress; // it's already bytes
                }
                onProgress(loaded, fileData.size);
            }
        }
    });

    // Store Embedding Async
    aiService.storeEmbedding(result.id.toString(), extractedText, { filename: aiMetadata.suggestedName || fileName, category: aiMetadata.category || 'Uncategorized' });

    // Perform Deep Analysis Async
    aiService.performDeepAnalysis(result.id.toString(), newPath, fileData.mimetype)
        .finally(() => {
            try {
                fs.unlinkSync(newPath);
                console.log(`[AI] Cleaned up temp file ${newPath}`);
            } catch (err) {
                console.error("Cleanup error:", err);
            }
        });

    return { messageId: result.id, metadata };
}

async function fetchFiles() {
    await ensureClient();

    let messages;
    try {
        messages = await withTimeout(client.getMessages('me', {
            limit: 200,
        }), 10000, 'Timed out loading files from Telegram.');
    } catch (err) {
        console.warn("fetchFiles error, attempting reconnect...", err.message);
        await client.connect();
        messages = await withTimeout(client.getMessages('me', {
            limit: 200,
        }), 15000, 'Timed out loading files from Telegram after reconnect.');
    }

    const files = [];
    const now = new Date();

    for (const msg of messages) {
        let meta = null;
        try {
            if (msg.message && msg.message.startsWith('{')) {
                meta = JSON.parse(msg.message); 
            }
        } catch (e) {}

        if (meta && meta.trashed && meta.trashedAt) {
            const trashedDate = new Date(meta.trashedAt);
            const diffDays = (now - trashedDate) / (1000 * 60 * 60 * 24);
            if (diffDays > 30) {
                await client.deleteMessages('me', [msg.id], { revoke: true });
                continue;
            }
        }

        if (msg.media && (msg.media.document || msg.media.photo)) {
            let defaultName = msg.file?.name;
            if (!defaultName && msg.media.photo) {
                defaultName = `photo_${msg.id}.jpg`;
            } else if (!defaultName) {
                defaultName = `file_${msg.id}`;
            }
            
            const getFileCategory = (filename) => {
                if (filename.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return 'Images';
                if (filename.match(/\.(mp4|avi|mov|mkv|webm)$/i)) return 'Media';
                if (filename.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'Audio';
                if (filename.match(/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|csv|md|c|cpp|py|js|json|html|css|rs|go|java|sh|zip|tar|gz)$/i)) return 'Documents';
                return 'Uncategorized';
            };

            const defaultMeta = {
                filename: defaultName,
                folder: '/',
                category: getFileCategory(defaultName),
                size: msg.file?.size || 0,
                uploadedAt: new Date(msg.date * 1000).toISOString()
            };

            meta = { ...defaultMeta, ...(meta || {}) };
            
            // Normalize path
            let folderPath = meta.folder || '/';
            folderPath = String(folderPath).trim();
            if (!folderPath.startsWith('/')) folderPath = '/' + folderPath;
            if (folderPath.length > 1 && folderPath.endsWith('/')) folderPath = folderPath.slice(0, -1);
            meta.folder = folderPath;

            files.push({
                messageId: msg.id,
                ...meta
            });
        } else if (meta && meta.isFolder) {
            files.push({
                messageId: msg.id,
                ...meta
            });
        }
    }
    return files;
}

async function updateFileMetadata(messageId, updates) {
    await ensureClient();
    const messages = await client.getMessages('me', { ids: [parseInt(messageId)] });
    if (!messages.length || !messages[0]) throw new Error("Message not found");
    
    let meta = {};
    try {
        if (messages[0].message && messages[0].message.startsWith('{')) {
            meta = JSON.parse(messages[0].message);
        }
    } catch (e) {}
    
    const newMeta = { ...meta, ...updates };
    const newText = JSON.stringify(newMeta);
    
    await client.editMessage('me', {
        message: parseInt(messageId),
        text: newText
    });
    
    return newMeta;
}

async function duplicateFile(messageId, updates = {}) {
    await ensureClient();
    const messages = await client.getMessages('me', { ids: [parseInt(messageId)] });
    if (!messages.length || !messages[0]) throw new Error("Message not found");
    const msg = messages[0];
    
    let meta = {};
    try {
        if (msg.message && msg.message.startsWith('{')) {
            meta = JSON.parse(msg.message);
        }
    } catch (e) {}
    
    // Duplicate files get an updated creation timestamp
    const newMeta = { ...meta, ...updates, uploadedAt: new Date().toISOString() };
    const newText = JSON.stringify(newMeta);
    
    const options = { message: newText };
    if (msg.media) {
        options.file = msg.media;
    }
    
    const sent = await client.sendMessage('me', options);
    
    return {
        messageId: sent.id,
        ...newMeta
    };
}

async function createFolder(folderName, parentPath, category) {
    await ensureClient();
    const metadata = JSON.stringify({
        isFolder: true,
        filename: folderName,
        folder: parentPath,
        category: category || 'My Drive',
        uploadedAt: new Date().toISOString()
    });

    const result = await client.sendMessage('me', { message: metadata });
    return { messageId: result.id, metadata };
}

async function deleteFiles(messageIds) {
    await ensureClient();
    const ids = messageIds.map(id => parseInt(id));
    await client.deleteMessages('me', ids, { revoke: true });
    return { success: true, deletedCount: ids.length };
}

async function downloadFile(messageId, req, res) {
    await ensureClient();
    const messages = await client.getMessages('me', {
        ids: [parseInt(messageId)]
    });
    
    if (messages.length === 0 || !messages[0] || !messages[0].media) {
        res.status(404).send("File not found");
        return;
    }

    const message = messages[0];
    let fileName = message.file?.name;
    
    let fileSize = message.file?.size || 0;
    let mimeType = 'application/octet-stream';
    
    try {
        if (message.message && message.message.startsWith('{')) {
            const meta = JSON.parse(message.message);
            if (meta.filename) fileName = meta.filename;
            if (meta.size) fileSize = meta.size;
            if (meta.mimetype) mimeType = meta.mimetype;
        }
    } catch(e) {}

    if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        const mimeMap = {
            'mp4': 'video/mp4', 'mkv': 'video/x-matroska', 'webm': 'video/webm',
            'avi': 'video/x-msvideo', 'mov': 'video/quicktime',
            'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
            'gif': 'image/gif', 'svg': 'image/svg+xml', 'webp': 'image/webp'
        };
        if (ext && mimeMap[ext]) {
            mimeType = mimeMap[ext];
        }
    }

    const encodedFileName = encodeURIComponent(fileName);
    const range = req.headers.range;

    let thumbSize;
    if (message.media.photo && message.media.photo.sizes) {
        let maxSize = 0;
        let maxType = '';
        for (const size of message.media.photo.sizes) {
            const currentSize = size.size || (size.w * size.h) || 0;
            if (currentSize > maxSize) {
                maxSize = currentSize;
                maxType = size.type;
            }
        }
        if (maxType) thumbSize = maxType;
    }

    // Fast multi-worker download for files < 50MB
    // This loads the file into memory using 16 concurrent connections, bypassing sequential chunk buffering
    if (fileSize < 50 * 1024 * 1024 || (message.media && message.media.photo)) { 
        try {
            const buffer = await client.downloadMedia(message.media, { workers: 16 });
            if (buffer && buffer.length > 0) {
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
                    const chunksize = (end - start) + 1;
                    
                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': mimeType,
                        'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`
                    });
                    res.end(buffer.slice(start, end + 1));
                } else {
                    res.setHeader('Content-Length', buffer.length);
                    res.setHeader('Content-Type', mimeType);
                    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFileName}`);
                    res.status(200).send(buffer);
                }
                return;
            }
        } catch (e) {
            console.error("Fast download failed, falling back to standard stream", e);
        }
    }

    if (range && fileSize > 0) {
        // Handle Range Requests for Video Streaming (> 50MB)
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`
        });

        // Maximize Telegram's chunk size to 1MB to reduce latency
        const alignSize = 1024 * 1024;
        const alignedStart = Math.floor(start / alignSize) * alignSize;
        const skipBytes = start - alignedStart;

        let bytesSent = 0;
        let isFirstChunk = true;
        
        for await (const chunk of client.iterDownload({
            file: message.media,
            thumbSize: thumbSize,
            requestSize: alignSize,
            offset: bigInt(alignedStart)
        })) {
            if (bytesSent >= chunksize) break;
            
            let dataToSend = chunk;
            if (isFirstChunk && skipBytes > 0) {
                dataToSend = chunk.slice(skipBytes);
            }
            isFirstChunk = false;
            
            const remaining = chunksize - bytesSent;
            if (dataToSend.length > remaining) {
                dataToSend = dataToSend.slice(0, remaining);
            }
            
            res.write(dataToSend);
            bytesSent += dataToSend.length;
        }
        res.end();
    } else {
        // Standard Download
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', mimeType);
        
        let sentHeader = false;
        for await (const chunk of client.iterDownload({
            file: message.media,
            thumbSize: thumbSize,
            requestSize: 1024 * 1024
        })) {
            if (!sentHeader) {
                res.status(200);
                sentHeader = true;
            }
            res.write(chunk);
        }
        res.end();
    }
}

module.exports = { connectClient, sendCode, login, uploadFile, fetchFiles, downloadFile, updateFileMetadata, duplicateFile, createFolder, getUser, getProfilePicture, deleteFiles, getClient: () => client, setOnNewMessageCallback };
