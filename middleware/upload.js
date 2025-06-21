const multer = require('multer');
const path = require('path');

// Hàm xử lý tên file tiếng Việt
function sanitizeFileName(fileName) {
    // Loại bỏ dấu và chuyển về ASCII
    return fileName.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Cấu hình storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        // Tạo tên file ngẫu nhiên + timestamp để tránh trùng
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = sanitizeFileName(path.parse(file.originalname).name);
        const ext = path.extname(file.originalname);
        cb(null, sanitizedName + '-' + uniqueSuffix + ext);
    }
});

// Lọc file
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/',
        'audio/',
        'video/',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/',
        'application/zip',
        'application/x-rar-compressed'
    ];

    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type);

    if (isAllowed) {
        cb(null, true);
    } else {
        console.log('Rejected file type:', file.mimetype);
        cb(new Error(`Không hỗ trợ loại file: ${file.mimetype}`), false);
    }
};

// Cấu hình upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Giới hạn 10MB
    }
});

module.exports = upload; 