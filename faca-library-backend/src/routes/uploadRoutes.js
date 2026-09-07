const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { upload, uploadFile } = require('../controllers/uploadController');

// POST /api/upload — upload ảnh đại diện (JWT, multipart/form-data, field "file")
router.post('/', authMiddleware, upload.single('file'), uploadFile);

module.exports = router;
