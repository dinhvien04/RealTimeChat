document.addEventListener('DOMContentLoaded', async function () {
    const token = getCookie('authToken');
    if (!token) {
        window.location.replace('../index.html');
        return;
    }
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Không thể lấy danh sách user');
        const users = await res.json();
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email || ''}</td>
                <td>${user.role}</td>
                <td style="text-align:center;">
                    ${user.isActive ? '<span style=\'color:#4caf50\'>✔</span>' : '<span style=\'color:#f44336\'>✖</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = `<tr><td colspan='4' style='text-align:center;color:#f44336;'>${e.message}</td></tr>`;
    }
}); 