import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../firebase.js';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';

const API_KEY = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

let chatHistory = [];

const ChatController = {
    chat_get_session: async (req, res) => {
        const chatSessionRef = collection(db, "chatSession")
        const q = query(chatSessionRef, orderBy("createdAt", "desc"));
        const chatSessionSnapshot = await getDocs(q);
        const chatSessionArray = chatSessionSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        if (chatSessionArray.length < 1) {
            return res.status(404).json({
                status: 404,
                message: "Sessions not found",
            });
        }

        return res.status(200).json({
            status: 200,
            message: "Success",
            data: chatSessionArray
        });
    },

    chat_get_history_by_session: async (req, res) => {
        const sessionId = req.params.sessionId;
        console.log("Session ID:", sessionId);
        // const chatHistorySnapshot = await getDocs(collection(db, "chatSession"));

        // const chatHistoryRef = collection(db, "chatSession", sessionId, "chatHistory");

        // const chatHistorySnapshot = await getDocs(chatHistoryRef);
        // const chatHistoryArray = chatHistorySnapshot.docs.map((doc) => ({
        //     id: doc.id,
        //     ...doc.data(),
        // }));

        const chatHistoryRef = collection(db, "chatSession", sessionId, "chatHistory");
        const q = query(chatHistoryRef, orderBy("createdAt", "asc")); // or "desc"

        const chatHistorySnapshot = await getDocs(q);
        const chatHistoryArray = chatHistorySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // console.log(JSON.stringify(chatHistoryArray, null, 2));

        return res.status(200).json({
            status: 200,
            message: "Success",
            data: chatHistoryArray
        });
    },

    chat_send_prompt: async (req, res) => {
        const { sessionId, message, type } = req.body;

        let id = sessionId

        if (!message) return res.status(400).json({
            status: 400,
            message: "Missing param(s) in request body"
        });

        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 2048,
                },
            });

            if (!id) {
                try {
                    const chatSessionRef = collection(db, "chatSession")
                    const docRef = await addDoc(chatSessionRef, {
                        sessionName: message,
                        createdAt: serverTimestamp()
                    });
                    id = docRef.id
                } catch (e) {
                    console.error("Error adding document: ", e);
                    return res.status(500).json({
                        status: 500,
                        message: e.message
                    });
                }
            }

            const chatHistoryRef = collection(db, "chatSession", id, "chatHistory");
            const q = query(chatHistoryRef, orderBy("createdAt", "asc")); // or "desc"

            const chatHistorySnapshot = await getDocs(q);
            const chatHistoryArray = chatHistorySnapshot.docs.map((doc) => ({
                role: doc.data().role,
                parts: doc.data().parts,
            }));
            console.log(JSON.stringify(chatHistoryArray, null, 2));
            const chatSession = model.startChat({ history: chatHistoryArray });

            const formattedMessage = `
            You are an AI psychologist (named "MinShield") who specializes in the mental health effects of online gambling ('judol'). You will respond kindly and empathetically, as if you're speaking to someone from Indonesia. Only answer questions related to mental health and online gambling. Politely ignore all unrelated topics.
            ---
            ${message}
            `

            let prompt
            if (type == "shields") {
                prompt = `
                    You are an AI psychologist (named "MinShield") who specializes in the mental health effects of online gambling ('judol'). You will respond kindly and empathetically, as if you're speaking to someone from Indonesia. Only answer questions related to mental health and online gambling. Politely ignore all unrelated topics.
                    ---
                    ${message}
                    `
            } else {
                prompt = message
            }

            console.log(`prompt -> ${prompt}`)

            const result = await chatSession.sendMessage(prompt);
            const response = await result.response.text();

            try {
                const userRef = await addDoc(chatHistoryRef, {
                    role: "user",
                    parts: [{ text: message }],
                    createdAt: serverTimestamp()  // 👈 adds timestamp
                });
                const modelRef = await addDoc(chatHistoryRef, {
                    role: "model",
                    parts: [{ text: response }],
                    createdAt: serverTimestamp()  // 👈 adds timestamp
                });
                console.log("Document written with ID user: ", userRef.id);
                console.log("Document written with ID model: ", modelRef.id);
            } catch (e) {
                console.error("Error adding document: ", e);
                return res.status(500).json({
                    status: 500,
                    message: e.message
                });
            }

            return res.status(200).json({
                status: 200,
                message: "Success",
                input: message,
                response
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                status: 500,
                message: "Failed to process prompt"
            });
        }
    },

    chat_upload_document: async (req, res) => {
        if (!req.file) return res.status(400).json({
            status: 400,
            message: "No file uploaded"
        });

        try {
            const filePath = path.resolve(req.file.path);
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            global.plainTextContent = pdfData.text;

            fs.unlinkSync(filePath);
            return res.status(200).json({
                status: 200,
                message: "Document uploaded successfully"
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                status: 500,
                message: "Failed to parse document"
            });
        }
    },

    chat_send_prompt_document: async (req, res) => {
        const { question } = req.body;
        if (!global.plainTextContent) {
            return res.status(400).json({
                status: 400,
                message: "No document uploaded yet"
            });
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
                Answer based on the document only.`;

            const result = await model.generateContent(prompt);
            const response = await result.response.text();

            return res.status(200).json({
                status: 200,
                message: "Success",
                question,
                response
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                status: 500,
                message: "Failed to generate response"
            });
        }
    },
};

export default ChatController;
