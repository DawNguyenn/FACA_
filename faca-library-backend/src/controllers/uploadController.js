// POST /api/upload — nhận JSON { url }, trả về URL đó lại (cho phép gán URL ảnh trực tiếp)
// Backend không còn lưu trữ file, chỉ validation URL và trả về
const uploadFile = (req, res) => {
    try {
        const { url } = req.body || {};

        if (!url || typeof url !== 'string' || !url.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp URL ảnh (field "url").' });
        }

        const trimmedUrl = url.trim();

        // Basic URL validation
        try {
            new URL(trimmedUrl);
        } catch {
            return res.status(400).json({ success: false, message: 'URL ảnh không hợp lệ.' });
        }

        // Giới hạn độ dài URL
        if (trimmedUrl.length > 2048) {
            return res.status(400).json({ success: false, message: 'URL ảnh quá dài (tối đa 2048 ký tự).' });
        }

        return res.status(200).json({ success: true, url: trimmedUrl });
    } catch (error) {
        console.error('Lỗi xử lý URL ảnh:', error);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xử lý URL ảnh.' });
    }
};

module.exports = { uploadFile };
