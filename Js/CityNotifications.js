document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('ApiToken');
    if (!token) { window.location.href = 'index.html'; return; }

    const userData = getUserDataFromToken();
    const role = userData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || userData.role || '';
    const cityId = userData.cityId || userData['cityId'] || '';
    const teamId = userData.teamId || userData['teamId'] || '';
    
    const isGeneralTeam = (cityId === "30" || teamId === "35");

    // ==========================================
    // 1. رسم زراير الأكشن حسب الصلاحيات
    // ==========================================
    const buttonsContainer = document.getElementById('actionButtonsContainer');
    let buttonsHtml = '';
    buttonsContainer.innerHTML = buttonsHtml;

    // ==========================================
    // 2. سحب الداتا ورسم الكروت
    // ==========================================
    const cardsContainer = document.getElementById('notificationsCardsContainer');
    const loadingMessage = document.getElementById('loadingMessage');

    const response = await apiRequest('/Notification/city', 'GET');
    loadingMessage.style.display = 'none';

    if (response.ok && response.data) {
        const notifications = response.data;

        if (notifications.length === 0) {
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5 bg-light rounded-4 border-2 border-dashed">
                        <i class="fas fa-bell-slash fs-1 text-muted mb-3 d-block"></i>
                        <p class="text-muted fs-5 mb-0">لا توجد إشعارات مسجلة لهذه المدينة حالياً.</p>
                    </div>
                </div>`;
            return;
        }

        let html = '';
        notifications.forEach(item => {
            const dateStr = new Date(item.date).toLocaleString('sv-SE').replace('T', ' ').substring(0, 16);
            
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 border-0 shadow-sm rounded-4 hover-shadow transition">
                        <div class="card-header bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                            <span class="badge bg-light text-info border border-info border-opacity-25 px-3 py-2 rounded-pill">
                                <i class="fas fa-tag me-1 small"></i> إشعار مدينة
                            </span>
                            <small class="text-muted" dir="ltr"><i class="far fa-clock me-1"></i> ${dateStr}</small>
                        </div>
                        <div class="card-body px-4">
                            <h5 class="card-title fw-bold text-dark mb-3">${item.title}</h5>
                            <p class="card-text text-secondary leading-relaxed">${item.body}</p>
                        </div>
                    </div>
                </div>`;
        });
        cardsContainer.innerHTML = html;
    } else {
        cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">❌ فشل تحميل الإشعارات.</div></div>`;
    }
});