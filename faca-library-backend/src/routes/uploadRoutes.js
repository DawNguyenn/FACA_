const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadFile } = require('../controllers/uploadController');

// POST /api/upload — nhận JSON { url }, trả về URL (cho phép gán URL ảnh trực tiếp)
// Không cần multer vì không còn upload file
router.post('/', authMiddleware, uploadFile);

module.exports = router;
