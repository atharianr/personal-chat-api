import express from 'express';
const router = express.Router()

import ChatController from '../controllers/chat.js';
import upload from '../middlewares/upload-middleware.js';

router.get('/session/get-list', ChatController.chat_get_session)

router.get('/session/:sessionId/chat-history', ChatController.chat_get_history_by_session)

router.post('/prompt', ChatController.chat_send_prompt)

router.post('/upload', upload.single("document"), ChatController.chat_upload_document)

router.post('/ask-doc', ChatController.chat_send_prompt_document)

export default router;