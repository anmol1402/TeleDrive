const { GoogleGenAI } = require('@google/genai');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

const DB_PATH = require('path').join(__dirname, '..', 'vector_db.json');
let collection = {
    data: [],
    async add({ ids, embeddings, metadatas, documents }) {
        for (let i = 0; i < ids.length; i++) {
            const existingIdx = this.data.findIndex(d => d.id === ids[i]);
            const entry = {
                id: ids[i],
                embedding: embeddings[i],
                metadata: metadatas ? metadatas[i] : {},
                document: documents ? documents[i] : ""
            };
            if (existingIdx >= 0) this.data[existingIdx] = entry;
            else this.data.push(entry);
        }
        this.save();
    },
    async query({ queryEmbeddings, nResults, where }) {
        const queryEmb = queryEmbeddings[0];
        let candidates = this.data;
        
        if (where && where.id && where.id.$in) {
            const allowedIds = where.id.$in.map(id => id.toString());
            candidates = candidates.filter(c => allowedIds.includes(c.id));
        }

        const scored = candidates.map(c => ({
            ...c,
            score: cosineSimilarity(queryEmb, c.embedding)
        }));

        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, nResults);

        return {
            ids: [top.map(t => t.id)],
            documents: [top.map(t => t.document)],
            metadatas: [top.map(t => t.metadata)]
        };
    },
    save() {
        fs.writeFileSync(DB_PATH, JSON.stringify(this.data));
    },
    load() {
        if (fs.existsSync(DB_PATH)) {
            try {
                this.data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            } catch (e) {
                this.data = [];
            }
        }
    }
};
collection.load();

// Generate SHA-256 Hash
function generateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', err => reject(err));
    });
}

// Extract text from file (PDF, TXT, Images)
async function extractText(fileData, filePath) {
    const ext = (fileData.originalname || '').split('.').pop().toLowerCase();
    const mimetype = fileData.mimetype;

    try {
        if (mimetype.includes('image') || ['png', 'jpg', 'jpeg'].includes(ext)) {
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
            return text;
        } else if (mimetype.includes('pdf') || ext === 'pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } else if (mimetype.includes('text') || ['txt', 'csv', 'json'].includes(ext)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (e) {
        console.error("Extraction error:", e);
    }
    return '';
}

// Auto-Categorization & Renaming using Gemini
async function processFileMetadata(originalName, extractedText) {
    const prompt = `
    You are an AI assistant for a cloud drive. 
    Analyze this file name: "${originalName}" and this extracted text (first 500 chars): "${extractedText.substring(0, 500)}".
    
    1. Generate a meaningful, clean filename (e.g., IMG_0001.jpg -> Group Photo.jpg). Keep the original extension.
    2. Categorize it into EXACTLY ONE of these categories: Documents, Images, Videos, Audio, Study Material, Certificates, Finance, Others.
    
    Return ONLY a JSON object in this format (no markdown blocks, just raw JSON):
    {
        "suggestedName": "string",
        "category": "string"
    }
    `;

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        const rawJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(rawJson);
    } catch (e) {
        console.error("AI Metadata error:", e);
        return { suggestedName: originalName, category: 'Others' };
    }
}

// Generate Embeddings & Store in ChromaDB
async function storeEmbedding(fileId, text, metadata) {
    if (!collection || !text || text.trim() === '') return;
    
    try {
        // We can use LangChain's embedding or let Chroma use its default, but since the user requested Gemini API:
        const response = await genAI.models.embedContent({
            model: "gemini-embedding-001",
            contents: text
        });
        
        const embedding = response.embeddings[0].values;
        
        await collection.add({
            ids: [fileId.toString()],
            embeddings: [embedding],
            metadatas: [{ ...metadata }],
            documents: [text]
        });
    } catch (e) {
        console.error("Embedding storage error:", e);
    }
}

// Semantic Search
async function semanticSearch(query) {
    if (!collection) return [];
    try {
        const response = await genAI.models.embedContent({
            model: "gemini-embedding-001",
            contents: query
        });
        const queryEmbedding = response.embeddings[0].values;
        
        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: 10
        });
        
        // results.ids[0] contains the MongoDB _id of the matching files
        return results.ids[0] || [];
    } catch (e) {
        console.error("Semantic search error:", e);
        return [];
    }
}

// Chat with Files (RAG)
async function chatWithFiles(query, fileIds) {
    if (!collection) return "Vector database not initialized.";
    
    try {
        const response = await genAI.models.embedContent({
            model: "gemini-embedding-001",
            contents: query
        });
        
        const selectedIds = Array.isArray(fileIds) ? fileIds.filter(Boolean) : [];
        const results = await collection.query({
            queryEmbeddings: [response.embeddings[0].values],
            nResults: 5,
            ...(selectedIds.length > 0 ? { where: { id: { $in: selectedIds } } } : {})
        });
        
        const context = results.documents[0].join("\n\n");
        
        const prompt = `
        You are a helpful assistant analyzing documents in a user's cloud drive.
        Use the following extracted context to answer the query. If the answer is not in the context, say so.
        
        Context:
        ${context}
        
        Query: ${query}
        `;
        
        const chatResponse = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        return chatResponse.text;
    } catch (e) {
        console.error("RAG error:", e);
        return "Sorry, I encountered an error while analyzing the files.";
    }
}

async function getRecommendations(files) {
    // Generate some basic recommendations based on file metadata
    const dupes = {};
    const largeFiles = [];
    const oldFiles = [];
    const now = new Date();
    
    files.forEach(f => {
        let dupKey = f.hash;
        // Fallback for files uploaded outside the app (e.g. from phone) which lack hash metadata
        // We use exact size and category as a heuristic for duplicates, ignoring very small files
        if (!dupKey && f.size > 1024) {
            dupKey = `size_${f.size}_cat_${f.category}`;
        }

        if (dupKey) {
            if (dupes[dupKey]) dupes[dupKey].push(f);
            else dupes[dupKey] = [f];
        }
        
        if (f.size > 50 * 1024 * 1024) largeFiles.push(f); // > 50MB
        
        const diffDays = (now - new Date(f.uploadedAt)) / (1000 * 60 * 60 * 24);
        if (diffDays > 180) oldFiles.push(f);
    });
    
    const duplicateGroups = Object.values(dupes).filter(group => group.length > 1);
    
    return {
        duplicates: duplicateGroups.length,
        largeFiles: largeFiles.length,
        oldFiles: oldFiles.length,
        message: `You have ${duplicateGroups.length} duplicate files to clean up and ${largeFiles.length} large files you could compress.`
    };
}

// Advanced AI Analysis Pipeline (Insights)
const INSIGHTS_DB_PATH = require('path').join(__dirname, '..', 'insights_db.json');
let insightsDb = {};

function loadInsights() {
    if (fs.existsSync(INSIGHTS_DB_PATH)) {
        try {
            insightsDb = JSON.parse(fs.readFileSync(INSIGHTS_DB_PATH, 'utf8'));
        } catch (e) {
            insightsDb = {};
        }
    }
}
function saveInsights() {
    fs.writeFileSync(INSIGHTS_DB_PATH, JSON.stringify(insightsDb, null, 2));
}
loadInsights();

async function performDeepAnalysis(messageId, filePath, mimeType) {
    console.log(`[AI] Starting deep analysis for ${messageId} (${mimeType})`);
    try {
        let insights = {};
        const ext = filePath.split('.').pop().toLowerCase();
        
        if (mimeType.includes('pdf') || ext === 'pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            const textToAnalyze = data.text.substring(0, 5000); // Analyze first 5k chars
            
            const prompt = `
            Analyze this PDF text and extract metadata.
            Provide ONLY a raw JSON object with the following schema (no markdown):
            {
                "Summary": "string (a concise paragraph)",
                "Keywords": ["keyword1", "keyword2", "keyword3"],
                "Title": "string (inferred title)"
            }
            Text: ${textToAnalyze}
            `;
            const res = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            insights = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
            
        } else if (mimeType.includes('image') || ['png', 'jpg', 'jpeg'].includes(ext)) {
            // Provide image to Gemini using file API
            console.log("[AI] Uploading image to Gemini File API...");
            const uploadResult = await genAI.files.upload({ file: filePath, mimeType });
            const prompt = `
            Analyze this image and extract metadata.
            Provide ONLY a raw JSON object with the following schema (no markdown):
            {
                "Objects": ["obj1", "obj2", "obj3"],
                "OCR": "string (any visible text, or empty string)",
                "Caption": "string (a detailed descriptive caption)"
            }
            `;
            const res = await genAI.models.generateContent({ 
                model: 'gemini-2.5-flash', 
                contents: [uploadResult, prompt] 
            });
            insights = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
            
        } else if (mimeType.includes('audio')) {
            console.log("[AI] Uploading audio to Gemini File API...");
            const uploadResult = await genAI.files.upload({ file: filePath, mimeType });
            const prompt = `
            Listen to this audio. Provide ONLY a raw JSON object with the following schema (no markdown):
            {
                "Transcript": "string (full transcript of what is spoken)"
            }
            `;
            const res = await genAI.models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [uploadResult, prompt] 
            });
            insights = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
            
        } else if (mimeType.includes('video')) {
            console.log("[AI] Uploading video to Gemini File API...");
            const uploadResult = await genAI.files.upload({ file: filePath, mimeType });
            const prompt = `
            Watch this video. Provide ONLY a raw JSON object with the following schema (no markdown):
            {
                "Transcript": "string (transcript of what is spoken)",
                "Summary": "string (visual and audio summary of the video)"
            }
            `;
            const res = await genAI.models.generateContent({ 
                model: 'gemini-1.5-flash', 
                contents: [uploadResult, prompt] 
            });
            insights = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
        }

        if (Object.keys(insights).length > 0) {
            insightsDb[messageId] = insights;
            saveInsights();
            console.log(`[AI] Deep analysis completed for ${messageId}`);
        }
    } catch (e) {
        console.error("[AI] Deep analysis failed:", e);
    }
}

function getInsights(messageId) {
    return insightsDb[messageId] || null;
}

module.exports = {
    generateFileHash,
    extractText,
    processFileMetadata,
    storeEmbedding,
    semanticSearch,
    chatWithFiles,
    getRecommendations,
    performDeepAnalysis,
    getInsights
};
