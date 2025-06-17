const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const BadWord = require('../models/BadWord');
const AuditLog = require('../models/AuditLog');

// Middleware kiểm tra admin
const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Không có token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token không hợp lệ' });
    }
};

// Get all users
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Update user status (active/inactive)
router.patch('/users/:userId/status', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/users/:userId', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await Message.deleteMany({ sender: userId });
        await logAction(req.user._id, 'delete_user', userId, `Xóa user ${user.username}`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Hàm lọc từ cấm
async function filterBadWords(text) {
    const badwords = await BadWord.find();
    let filtered = text;
    badwords.forEach(bw => {
        const regex = new RegExp(bw.word, 'gi');
        filtered = filtered.replace(regex, '*'.repeat(bw.word.length));
    });
    return filtered;
}

// Lấy danh sách tin nhắn
router.get('/messages', isAdmin, async (req, res) => {
    try {
        const messages = await Message.find()
            .populate('sender', 'username')
            .sort({ createdAt: -1 });
        // Lọc từ cấm trong nội dung
        const filteredMessages = await Promise.all(messages.map(async msg => ({
            ...msg.toObject(),
            content: await filterBadWords(msg.content || '')
        })));
        res.json(filteredMessages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Delete message
router.delete('/messages/:messageId', isAdmin, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findByIdAndDelete(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        await logAction(req.user._id, 'delete_message', messageId, `Xóa tin nhắn: ${message.content}`);
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get statistics
router.get('/statistics', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalMessages = await Message.countDocuments();
        const totalVoiceMessages = await Message.countDocuments({ type: 'voice' });

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newUsers24h = await User.countDocuments({ createdAt: { $gte: last24Hours } });
        const messages24h = await Message.countDocuments({ createdAt: { $gte: last24Hours } });

        res.json({
            totalUsers,
            activeUsers,
            totalMessages,
            totalVoiceMessages,
            last24Hours: {
                newUsers: newUsers24h,
                messages: messages24h
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy thống kê
router.get('/stats', isAdmin, async (req, res) => {
    try {
        // Đếm tổng số user và tin nhắn
        const totalUsers = await User.countDocuments();
        const totalMessages = await Message.countDocuments();

        // Lấy 5 user mới nhất
        const recentUsers = await User.find({}, 'username email createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        // Lấy 5 tin nhắn mới nhất
        const recentMessages = await Message.find({}, 'content createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            totalUsers,
            totalMessages,
            recentUsers,
            recentMessages
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Khóa/mở khóa tài khoản user
router.put('/users/:userId/toggle-status', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Không thể khóa tài khoản admin' });
        user.isActive = isActive;
        await user.save();
        await logAction(req.user._id, isActive ? 'unlock_user' : 'lock_user', userId, `${isActive ? 'Mở khóa' : 'Khóa'} user ${user.username}`);
        res.json({ message: `Đã ${isActive ? 'mở khóa' : 'khóa'} tài khoản thành công` });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Lấy danh sách từ cấm
router.get('/badwords', isAdmin, async (req, res) => {
    try {
        const words = await BadWord.find().sort({ createdAt: -1 });
        res.json(words);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Thêm từ cấm
router.post('/badwords', isAdmin, async (req, res) => {
    try {
        const { word } = req.body;
        if (!word || !word.trim()) return res.status(400).json({ message: 'Từ cấm không hợp lệ' });
        const exists = await BadWord.findOne({ word: word.trim().toLowerCase() });
        if (exists) return res.status(409).json({ message: 'Từ đã tồn tại' });
        const newWord = new BadWord({ word: word.trim().toLowerCase() });
        await newWord.save();
        await logAction(req.user._id, 'add_badword', newWord._id, `Thêm từ cấm: ${newWord.word}`);
        res.status(201).json(newWord);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Xóa từ cấm
router.delete('/badwords/:id', isAdmin, async (req, res) => {
    try {
        await BadWord.findByIdAndDelete(req.params.id);
        await logAction(req.user._id, 'delete_badword', req.params.id, `Xóa từ cấm`);
        res.json({ message: 'Đã xóa từ cấm' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API lấy danh sách log
router.get('/audit-logs', isAdmin, async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .limit(200);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Helper ghi log
async function logAction(userId, action, target, detail) {
    try {
        await AuditLog.create({ user: userId, action, target, detail });
    } catch (e) { /* ignore log error */ }
}

module.exports = router; 