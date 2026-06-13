document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('ApiToken');
    if (!token) { window.location.href = 'index.html'; return; }

    const userData = getUserDataFromToken();
    const role = userData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || userData.role || '';
    
    // لو مش أدمن، اطرده على الداشبورد
    if (role !== 'Admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    const tableBody = document.getElementById('notificationsTableBody');
    const loadingMessage = document.getElementById('loadingMessage');

    
    const response = await apiRequest('/Notification/all-Notifications', 'GET');

    loadingMessage.style.display = 'none';

    if (response.ok && response.data) {
        const notifications = response.data;

        if (notifications.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5 text-muted">
                        <i class="fas fa-inbox fa-3x mb-3 d-block"></i> لا توجد إشعارات في النظام حتى الآن.
                    </td>
                </tr>`;
            return;
        }

        let html = '';
        notifications.forEach(item => {
            const dateStr = new Date(item.date).toLocaleString('sv-SE').replace('T', ' ').substring(0, 16);
            
            // رسم بادجات المدن
            let citiesHtml = '';
            if (item.cityName && item.cityName.length > 0) {
                item.cityName.forEach(city => {
                    citiesHtml += `<span class="badge bg-info text-dark me-1 mb-1 fs-6">${city}</span>`;
                });
            } else {
                citiesHtml = `<span class="badge bg-secondary mb-1 fs-6">إشعار عام / مستخدم</span>`;
            }

            html += `
                <tr>
                    <td class="text-muted px-4" style="width: 15%;" dir="ltr">${dateStr}</td>
                    <td class="fw-bold text-dark">${item.title}</td>
                    <td>${item.body}</td>
                    <td class="px-4">${citiesHtml}</td>
                </tr>`;
        });
        tableBody.innerHTML = html;
    } else {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">❌ حدث خطأ أثناء جلب البيانات</td></tr>`;
    }
});
