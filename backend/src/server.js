const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { connectClient, sendCode, login, uploadFile, fetchFiles, downloadFile, updateFileMetadata, createFolder, getUser, getProfilePicture, deleteFiles } = require('./telegramClient');
const { semanticSearch, chatWithFiles, getRecommendations, getInsights } = require('./services/aiService');
require('dotenv').config();

let sseClients = [];

function sendApiError(res, error) {
    const message = error?.message || 'An unexpected server error occurred.';
    const isTelegramUnavailable = /timed out|not initialized|connect|network|eacces/i.test(message);
    console.error(message);
    res.status(isTelegramUnavailable ? 503 : 500).json({ error: message });
}

function notifyUpdate() {
    sseClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify({ type: 'UPDATE' })}\n\n`);
        } catch (e) {
            console.error('SSE Write Error:', e);
        }
    });
}

function notifyProgress(uploadId, loadedBytes, totalBytes) {
    sseClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify({ type: 'UPLOAD_PROGRESS', uploadId, loadedBytes, totalBytes })}\n\n`);
        } catch (e) {
            console.error('SSE Write Error:', e);
        }
    });
}

const app = express();
app.use(cors());
app.use(express.json());

const uploadDirectory = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({ dest: uploadDirectory }); // Temporary local storage for uploads before pushing to Telegram

app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial message
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
    
    sseClients.push(res);
    
    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
    });
});

app.post('/api/auth/sendCode', async (req, res) => {
    try {
        const { phone } = req.body || {};
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ error: 'A phone number is required' });
        }
        const result = await sendCode(phone);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, code } = req.body || {};
        if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') {
            return res.status(400).json({ error: 'Phone number and verification code are required' });
        }
        const result = await login(phone, code);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/user', async (req, res) => {
    try {
        const user = await getUser();
        if (user) res.json({ success: true, user });
        else res.status(401).json({ success: false, error: 'Not logged in' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/user/avatar', async (req, res) => {
    try {
        const buffer = await getProfilePicture();
        if (buffer && buffer.length > 0) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.send(buffer);
        } else {
            res.status(404).send('No profile picture found');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'A file is required' });
        }
        const { folder, uploadId } = req.body; 
        const result = await uploadFile(req.file, folder, (loaded, total) => {
            if (uploadId) {
                notifyProgress(uploadId, loaded, total);
            }
        });
        if (result.duplicate) {
            return res.json({ success: false, duplicate: true, file: result.file });
        }
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/files', async (req, res) => {
    try {
        console.log("Received /api/files request");
        const { query } = req.query;
        console.log("Calling fetchFiles()");
        let files = await fetchFiles(); // Fetch all from Telegram
        console.log("fetchFiles() completed, got files:", files.length);
        
        if (query && query.trim() !== '') {
            console.log("Executing semantic search for:", query);
            // AI Semantic Search
            const matchingIds = await semanticSearch(query);
            if (matchingIds.length > 0) {
                // Filter the fetched files to only those that match the semantic search
                // Chroma returns messageIds as strings, so we parse them to ints
                const intIds = matchingIds.map(id => parseInt(id));
                files = files.filter(f => intIds.includes(f.messageId));
            } else {
                files = [];
            }
        }
        res.json({ success: true, files });
    } catch (error) {
        sendApiError(res, error);
    }
});

app.get('/api/files/download/:messageId', async (req, res) => {
    try {
        await downloadFile(req.params.messageId, req, res);
    } catch (error) {
        console.error("downloadFile error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.post('/api/files/update/:messageId', async (req, res) => {
    try {
        const updates = req.body;
        const result = await updateFileMetadata(req.params.messageId, updates);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/folder', async (req, res) => {
    try {
        const { folderName, parentPath, category } = req.body;
        const result = await createFolder(folderName, parentPath, category);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/files/:id/insights', async (req, res) => {
    try {
        const insights = getInsights(req.params.id);
        if (insights) {
            res.json({ success: true, insights });
        } else {
            res.status(404).json({ success: false, error: 'No insights found for this file' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/delete', async (req, res) => {
    try {
        const { messageIds } = req.body;
        if (!messageIds || !Array.isArray(messageIds)) {
            return res.status(400).json({ error: "messageIds array is required" });
        }
        const result = await deleteFiles(messageIds);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const allFiles = await fetchFiles();
        const activeFiles = allFiles.filter(f => !f.trashed && !f.isFolder);
        
        const recommendations = await getRecommendations(activeFiles);
        
        const totalSize = activeFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        const categories = {};
        activeFiles.forEach(f => {
            const cat = f.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + (f.size || 0);
        });

        // Advanced Analytics
        const capacity = 100 * 1024 * 1024 * 1024; // 100 GB simulated capacity
        
        // Largest Files
        const largestFiles = [...activeFiles]
            .sort((a, b) => (b.size || 0) - (a.size || 0))
            .slice(0, 5)
            .map(f => ({ name: f.filename, size: f.size }));

        // Largest Folders
        const folderMap = {};
        activeFiles.forEach(f => {
            const folder = f.folder || '/';
            folderMap[folder] = (folderMap[folder] || 0) + (f.size || 0);
        });
        const largestFolders = Object.entries(folderMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, size]) => ({ name: name === '/' ? 'Root' : name, size }));

        // Recent Uploads
        const recentUploads = [...activeFiles]
            .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
            .slice(0, 5)
            .map(f => ({ name: f.filename, date: f.uploadedAt, size: f.size }));
        
        res.json({ 
            success: true, 
            analytics: { 
                totalFiles: activeFiles.length, 
                totalSize, 
                categories,
                capacity,
                largestFiles,
                largestFolders,
                recentUploads
            },
            recommendations 
        });
    } catch (error) {
        sendApiError(res, error);
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { query, fileIds = [] } = req.body || {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'A query is required' });
        }
        if (!Array.isArray(fileIds)) {
            return res.status(400).json({ error: 'fileIds must be an array' });
        }
        // Convert messageIds to MongoDB ObjectIds if necessary, or pass directly to AI service
        // For simplicity, passing directly
        const answer = await chatWithFiles(query, fileIds);
        res.json({ success: true, answer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    const { setOnNewMessageCallback } = require('./telegramClient');
    setOnNewMessageCallback(() => {
        console.log("New message in Saved Messages detected. Notifying clients...");
        notifyUpdate();
    });
    connectClient().catch(error => {
        console.error('Telegram client initialization failed:', error.message);
    });
});
