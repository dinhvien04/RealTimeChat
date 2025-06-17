document.addEventListener('DOMContentLoaded', () => {
    const email = getQueryParam('email');
    if (!email) {
        createToast('Email không hợp lệ', 'error');
        return;
    }
    document.getElementById('email').value = email;
    document.getElementById('btnVerify').addEventListener('click', handleVerifyOtp);
});

/**
 * Get query parameter value
 */
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function handleVerifyOtp() {
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();
    if (!otp) {
        createToast('Vui lòng nhập mã OTP', 'error');
        return;
    }
    try {
        const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await response.json();
        if (response.ok) {
            createToast(data.message, 'success');
            setTimeout(() => {
                window.location.href = `reset-password.html?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
            }, 1500);
        } else {
            createToast(data.error || 'Mã OTP không hợp lệ', 'error');
        }
    } catch (error) {
        createToast('Lỗi xác minh OTP', 'error');
    }
} 