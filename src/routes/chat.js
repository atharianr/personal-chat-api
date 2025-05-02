const express = require('express')
const router = express.Router()

const ChatController = require('../controllers/chat')
const upload = require('../middlewares/upload-middleware')

router.get('/', ChatController.chat_check_default)

router.post('/message', ChatController.chat_send_message)

router.post('/prompt', ChatController.chat_send_prompt)

router.post('/upload', upload.single("document"), ChatController.chat_upload_document)

router.post('/ask-doc', ChatController.chat_send_prompt_document)

module.exports = router
