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
      <p>Chào bạn,</p>
      <p>Mã OTP của bạn là: <strong>${otp}</strong>.</p>
      <p>Mã có hiệu lực trong 10 phút.</p>
    `
    };
    return transporter.sendMail(mailOptions);
}

module.exports = {
    sendResetPasswordEmail,
    sendOtpEmail
}; 