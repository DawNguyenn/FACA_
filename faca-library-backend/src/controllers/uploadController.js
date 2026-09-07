const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Cấu hình lưu file ảnh vào thư mục uploads/
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const name = `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // tối đa 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        cb(new Error('Chỉ cho phép tải lên tệp hình ảnh.'));
    }
});

// POST /api/upload — nhận FormData { file }, trả về URL public của ảnh
const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Không nhận được tệp ảnh (field "file").' });
    }
    // URL tương đối công khai (được serve tĩnh tại /uploads)
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    return res.status(201).json({ success: true, url, filename: req.file.filename });
};

module.exports = { upload, uploadFile };
