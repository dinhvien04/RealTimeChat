const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // ví dụ: 'delete_user', 'lock_user', 'delete_message', 'add_badword', ...
    target: { type: String }, // id hoặc thông tin đối tượng bị tác động
    detail: { type: String }, // mô tả chi tiết
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema); 