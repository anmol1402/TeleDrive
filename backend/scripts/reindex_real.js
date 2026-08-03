const { connectClient, fetchFiles, getClient } = require('../telegramClient');
const aiService = require('../services/aiService');
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        console.log('Connecting to Telegram...');
        await connectClient();
        const client = getClient();
        
        console.log('Fetching files...');
        const files = await fetchFiles();
        const activeFiles = files.filter(f => !f.isFolder && !f.trashed);
        console.log(`Found ${activeFiles.length} active files to index.`);
        
        for (const f of activeFiles) {
            console.log(`Processing ${f.filename}...`);
            
            // Get message
            const messages = await client.getMessages('me', { ids: [parseInt(f.messageId)] });
            if (messages.length === 0 || !messages[0] || !messages[0].media) {
                console.log(`Could not find media for ${f.filename}`);
                continue;
            }
            
            const message = messages[0];
            const tempFilePath = path.join(__dirname, '..', 'uploads', `temp_${f.messageId}`);
            
            // Download file
            console.log(`Downloading ${f.filename}...`);
            const buffer = await client.downloadMedia(message.media, {
                workers: 1,
            });
            
            if (!buffer) {
                console.log(`Failed to download ${f.filename}`);
                continue;
            }
            
            fs.writeFileSync(tempFilePath, buffer);
            
            // Extract text
            console.log(`Extracting text from ${f.filename}...`);
            const fileData = {
                originalname: f.filename,
                mimetype: f.mimetype || '' // we might not have exact mimetype, aiService guesses by extension
            };
            
            const extractedText = await aiService.extractText(fileData, tempFilePath);
            
            // Store embedding
            if (extractedText && extractedText.trim() !== '') {
                console.log(`Generating and storing embedding for ${f.filename}...`);
                await aiService.storeEmbedding(f.messageId.toString(), extractedText, { filename: f.filename, category: f.category });
                console.log(`Successfully indexed ${f.filename}.`);
            } else {
                console.log(`No text extracted from ${f.filename}.`);
            }
            
            // Cleanup
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }
        
        console.log('Re-indexing complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during re-indexing:', error);
        process.exit(1);
    }
})();
