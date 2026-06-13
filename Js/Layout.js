document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderGlobalLayout();
});

function initTheme() {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        document.documentElement.setAttribute('data-bs-theme', storedTheme);
    } else {
        document.documentElement.setAttribute('data-bs-theme', 'light');
        localStorage.setItem('theme', 'light'); // اختياري: لحفظ الخيار للمرات القادمة
    }
}
function renderGlobalLayout() {
    const layoutContainer = document.getElementById('layout-container');
    if (!layoutContainer) return;

    let userData = {};
    try {
        if (typeof getUserDataFromToken === 'function') {
            userData = getUserDataFromToken() || {};
        }
    } catch (e) { console.warn("جارٍ تحميل بيانات المستخدم..."); }
    
    const role = userData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || userData.role || 'Admin';
    const name = userData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || userData.unique_name || userData.name || 'يا هندسة';
    const cityId = userData.cityId || userData['cityId'] || '';
    const teamId = userData.teamId || userData['teamId'] || '';

    const isAdmin = role === 'Admin';
    const isEmployee = role === 'Employee';
    const isGeneralTeam = (cityId === "30" || teamId === "35");

    let navLinks = '';

    // 1. غرفة العمليات
    if (isAdmin || (isEmployee && !isGeneralTeam)) {
        navLinks += `<li class="nav-item mx-1"><a class="nav-link text-warning fw-bold d-flex align-items-center" href="Dashboard.html"><i class="fa-solid fa-chart-line me-2"></i> غرفة العمليات</a></li>`;
    }

    // 2. المواطنين
    if (isAdmin || (isEmployee && !isGeneralTeam)) {
        navLinks += `<li class="nav-item mx-1"><a class="nav-link text-white fw-bold d-flex align-items-center" href="Citizens.html"><i class="fa-solid fa-users me-2"></i> المواطنين</a></li>`;
    }

    // 3. إدارة الكوادر للفِرَق (أدمن)
    if (isAdmin) {
        navLinks += `
            <li class="nav-item dropdown mx-1">
                <a class="nav-link dropdown-toggle text-success fw-bold d-flex align-items-center" href="#" data-bs-toggle="dropdown">
                    <i class="fa-solid fa-users-gear me-2"></i> إدارة الكوادر والفِرَق
                </a>
                <ul class="dropdown-menu shadow-lg border-0 rounded-3 mt-2">
                    <li><a class="dropdown-item py-2 fw-bold" href="Employees.html"><i class="fa-solid fa-user-tie text-primary me-2"></i> الموظفين</a></li>
                    <li><a class="dropdown-item py-2 fw-bold" href="Teams.html"><i class="fa-solid fa-people-group text-success me-2"></i> الفِرَق الميدانية</a></li>
                </ul>
            </li>
           <li class="nav-item mx-1">
    <a class="nav-link text-white fw-bold d-flex align-items-center" href="Analytics.html">
        <i class="fa-solid fa-chart-pie me-2"></i> تحليلات Power BI
    </a>
</li>
        `;
    }
    

    // 4. مركز الإشعارات
    if (isAdmin || isEmployee) {
        navLinks += `
            <li class="nav-item dropdown mx-1">
                <a class="nav-link dropdown-toggle text-danger fw-bold d-flex align-items-center pulse-button" href="#" data-bs-toggle="dropdown">
                    <i class="fa-solid fa-bell me-2"></i> مركز الإشعارات
                </a>
                <ul class="dropdown-menu shadow-lg border-0 rounded-3 mt-2">
                    ${isAdmin ? `<li><a class="dropdown-item py-2 text-danger fw-bold" href="AllNotification.html"><i class="fa-solid fa-globe text-danger me-2"></i> كل إشعارات النظام</a></li><li><hr class="dropdown-divider"></li>` : ''}
                    ${isEmployee && isGeneralTeam ? `<li><a class="dropdown-item py-2 text-danger fw-bold" href="CreateWarning.html"><i class="fa-solid fa-tower-broadcast text-danger me-2"></i> بث تحذير للمدن</a></li><li><hr class="dropdown-divider"></li>` : ''}
                    <li><a class="dropdown-item py-2 fw-bold" href="CityNotifications.html"><i class="fa-solid fa-city text-info me-2"></i> إشعارات قطاع مدينتي</a></li>
                    ${isEmployee && !isGeneralTeam ? `<li><a class="dropdown-item py-2 fw-bold" href="SendToUser.html"><i class="fa-solid fa-paper-plane text-success me-2"></i> إرسال لمواطن</a></li>` : ''}
                </ul>
            </li>
        `;
    }

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const themeIconClass = isDark ? 'fa-sun text-warning' : 'fa-moon text-white';

    const fullLayoutHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary border-opacity-50 shadow-lg py-2 fixed-top" style="background-color: #1a1d20 !important;">
            <div class="container-fluid px-3">
                
                <a class="navbar-brand d-flex align-items-center" href="Dashboard.html">
                    <img src="assets/images/redLogo.png" style="height: 75px; object-fit: contain; margin-top: -12px; margin-bottom: -12px;" class="position-relative z-1" alt="Logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/854/854878.png'">
                </a>
                
                <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <div class="collapse navbar-collapse" id="navbarContent">
                    <ul class="navbar-nav mx-auto mb-2 mb-lg-0 align-items-center">
                        ${navLinks}
                    </ul>
                    
                    <div class="d-flex align-items-center gap-3 mt-3 mt-lg-0">
                        
                        <button id="themeToggle" class="btn btn-outline-secondary rounded-circle d-flex justify-content-center align-items-center shadow-sm" style="width: 40px; height: 40px; border-color: rgba(255,255,255,0.2); transition: 0.3s;">
                            <i class="fa-solid ${themeIconClass} fs-5" id="themeIcon"></i>
                        </button>
                        
                        <div class="d-flex align-items-center bg-secondary bg-opacity-25 rounded-pill px-3 py-1 border border-secondary border-opacity-25">
                            <span class="text-white fw-bold pe-2">أهلاً، ${name.split('@')[0]}</span>
                            <a href="Profile.html" class="btn btn-light rounded-circle d-flex justify-content-center align-items-center shadow-sm ms-2" style="width: 32px; height: 32px; padding: 0;" title="الملف الشخصي">
                                <i class="fa-solid fa-user-gear text-dark"></i>
                            </a>
                        </div>
                        
                        <button id="globalLogoutBtn" class="btn btn-danger rounded-pill fw-bold px-4 shadow-sm">
                            <i class="fa-solid fa-right-from-bracket me-1"></i> خروج
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        <script src="Js/SignalRService.js"></script>
        <button onclick="window.scrollTo({top: 0, behavior: 'smooth'});" id="myBtn" class="btn btn-primary rounded-circle shadow-lg" style="position: fixed; bottom: 30px; right: 30px; display: none; z-index: 9999; width: 50px; height: 50px;" title="العودة للأعلى">
            <i class="fa-solid fa-arrow-up"></i>
        </button>

        <div id="global-loader" class="loader-container" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.9); z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status"></div>
            <p class="mt-3 fw-bold text-primary fs-5">جارِ التحميل...</p>
        </div>
    `;

    layoutContainer.innerHTML = fullLayoutHTML;

    // ضبط المسافة عشان النافبار ميغطيش
    document.body.style.paddingTop = '85px';

    setTimeout(() => { 
        const loader = document.getElementById("global-loader");
        if(loader) {
            loader.style.transition = "opacity 0.4s";
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 400);
        }
    }, 500);

    document.getElementById('globalLogoutBtn').addEventListener('click', () => {
        localStorage.removeItem('ApiToken');
        document.cookie = "ApiToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = 'index.html'; 
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = document.getElementById('themeIcon');
        if(newTheme === 'dark') { 
            icon.className = 'fa-solid fa-sun fs-5 text-warning'; 
        } else { 
            icon.className = 'fa-solid fa-moon fs-5 text-white'; 
        }

        if (typeof updateMapLayer === 'function') updateMapLayer();
    });

    window.addEventListener('scroll', () => {
        const btn = document.getElementById("myBtn");
        if (btn) {
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) btn.style.display = "block";
            else btn.style.display = "none";
        }
    });
}
