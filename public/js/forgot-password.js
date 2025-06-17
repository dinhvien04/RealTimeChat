document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnForgot').addEventListener('click', handleForgotPassword);
});

/**
 * Send forgot password request
 */
async function handleForgotPassword() {
    const email = document.getElementById('email').value.trim();
    if (!email) {
        createToast('Vui lòng nhập email', 'error');
        return;
    }
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            createToast(data.message, 'success');
            // Redirect to OTP verification page after sending OTP
            setTimeout(() => {
                window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}`;
            }, 2000);
        } else {
            createToast(data.error || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        createToast('Không thể gửi yêu cầu', 'error');
    }
} 