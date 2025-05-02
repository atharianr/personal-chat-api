require('dotenv').config(); // Load .env

const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.API_KEY
const genAI = new GoogleGenerativeAI(API_KEY);

let chatHistory = [];

// Check: TODO Revome later
exports.chat_check_default = async (req, res, next) => {
    res.send("<p>Hello, World!</p>");
}

// Test send message: TODO Revome later
exports.chat_send_message = async (req, res, next) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Missing 'message' in request body" });

    res.json({ received_message: message });
}

// Normal Prompt
exports.chat_send_prompt = async (req, res, next) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Missing 'message' in request body" });

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0,
                maxOutputTokens: 2048,
            },
        });

        if (!global.chatSession) {
            global.chatSession = await model.startChat({ history: chatHistory });
        }

        const result = await global.chatSession.sendMessage(message);
        const response = await result.response.text();

        chatHistory.push({ role: "user", parts: [{ text: message }] });
        chatHistory.push({ role: "model", parts: [{ text: response }] });

        res.json({ input: message, response });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process prompt" });
    }
}

// Upload
exports.chat_upload_document = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        const filePath = path.resolve(req.file.path);
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        global.plainTextContent = pdfData.text;

        fs.unlinkSync(filePath); // Delete temp file
        res.json({ message: "Document uploaded successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to parse document" });
    }
};

// Prompt with Docs
exports.chat_send_prompt_document = async (req, res, next) => {
    const { question } = req.body;
    if (!global.plainTextContent) {
        return res.status(400).json({ error: "No document uploaded yet" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            You are an assistant answering questions about a document.
            Document Content:
            """ 
            ${global.plainTextContent}
            """
            
            User question: ${question}
            Answer based on the document only.
            `;

        const result = await model.generateContent(prompt);
        const response = await result.response.text();

        res.json({ question, response });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate response" });
    }
}