const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');
const { auth } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Tìm user theo email hoặc username
        const user = await User.findOne({
            $or: [
                { email: email },
                { username: email } // trường email từ form có thể là username
            ]
        });

        if (!user) {
            return res.status(401).json({ error: 'Email/tên đăng nhập không tồn tại' });
        }

        // Kiểm tra tài khoản có bị khóa không
        if (!user.isActive) {
            return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Mật khẩu không đúng' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            user: {
                username: user.username,
                email: user.email,
                id: user._id,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Logout
router.post('/logout', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            user.lastLogin = new Date();
            await user.save();
        }
        res.json({ message: 'Đã đăng xuất' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify token
router.get('/verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({
            user: {
                username: user.username,
                email: user.email,
                id: user._id,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ $or: [{ email }, { username: email }] });
        if (user) {
            // Generate numeric OTP code
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.resetPasswordToken = otp;
            // OTP expires in 10 minutes
            user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
            await user.save();
            // Send OTP email
            await sendOtpEmail(user.email, otp);
        }
        // Always respond success to prevent email enumeration
        res.json({ message: 'Nếu có tài khoản, bạn sẽ nhận được mã OTP qua email.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/auth/verify-otp
 * @desc Verify OTP code before password reset
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({
            $or: [{ email }, { username: email }],
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }
        res.json({ message: 'OTP hợp lệ.' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        // Find user by email/username and valid OTP
        const user = await User.findOne({
            $or: [{ email }, { username: email }],
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ message: 'Mật khẩu đã được đặt lại thành công.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 