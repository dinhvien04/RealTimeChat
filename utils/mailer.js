// Load .env in case not loaded yet
require('dotenv').config();
// Debug env vars for mailer
console.log('Mailer ENV:', { GMAIL_USER: process.env.GMAIL_USER, GMAIL_APP_PASSWORD_exists: !!process.env.GMAIL_APP_PASSWORD });
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        // Hardcoded Gmail user for testing
        user: 'vien.computer.2004@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

/**
 * Send a password reset email
 * @param {string} toEmail - Recipient's email address
 * @param {string} resetLink - URL for password reset
 */
async function sendResetPasswordEmail(toEmail, resetLink) {
    const mailOptions = {
        from: `"Chat App" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: 'Đặt lại mật khẩu',
        html: `
      <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấp vào liên kết bên dưới để đặt lại mật khẩu (hết hạn sau 1 giờ):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    `,
    };
    return transporter.sendMail(mailOptions);
}

/**
 * Send an OTP code email
 * @param {string} toEmail - Recipient's email address
 * @param {string} otp - One-time password code
 */
async function sendOtpEmail(toEmail, otp) {
    const mailOptions = {
        from: `"Chat App" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: 'Mã xác thực OTP',
        html: `
      <p style="font-size:16px; color:#333;">Chào bạn,</p>
      <p style="font-size:14px; color:#333;">Đây là mã xác thực (OTP) của bạn:</p>
      <div style="background:#f1f1f1; padding:20px; text-align:center; border-radius:8px; margin:20px 0;">
        <span style="font-size:32px; font-weight:bold; letter-spacing:4px; color:#2c3e50;">${otp}</span>
      </div>
      <p style="font-size:12px; color:#666;">Mã có hiệu lực trong 10 phút.</p>
      <p style="font-size:12px; color:#666;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
    `
    };
    return transporter.sendMail(mailOptions);
}

module.exports = {
    sendResetPasswordEmail,
    sendOtpEmail
}; 