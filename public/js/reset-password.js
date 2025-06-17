document.addEventListener('DOMContentLoaded', () => {
    // Parse email and otp from query string
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const otp = params.get('otp');
    if (!email || !otp) {
        createToast('Liên kết không hợp lệ', 'error');
        return;
    }
    // Set hidden inputs
    document.getElementById('email').value = email;
    document.getElementById('otp').value = otp;
    document.getElementById('btnReset').addEventListener('click', handleResetPassword);
});

/**
 * Get query parameter value
 */
// (Already handled above with URLSearchParams)

/**
 * Send reset password request
 */
async function handleResetPassword() {
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    if (!email || !otp || !newPassword || !confirmPassword) {
        createToast('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        createToast('Mật khẩu xác nhận không khớp', 'error');
        return;
    }
    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            createToast(data.message, 'success');
            setTimeout(() => {
                const email = document.getElementById('email').value;
                window.location.href = `index.html?email=${encodeURIComponent(email)}`;
            }, 2000);
        } else {
            createToast(data.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        createToast('Không thể đặt lại mật khẩu', 'error');
    }
} 