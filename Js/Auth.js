// هنستنى لما الصفحة تحمل خالص
document.addEventListener('DOMContentLoaded', () => {
    
    // 💡 دالة صغيرة لفك تشفير التوكن ومعرفة مسار التوجيه (التوجيه الذكي)
    function getRedirectUrl(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const userData = JSON.parse(jsonPayload);
            const cityId = userData.cityId || userData['cityId'] || '';
            const teamId = userData.teamId || userData['teamId'] || '';
            
            // لو هو التيم العام (خصصنا لهم صفحة بث التحذير)
            if (cityId == 30 || teamId == 35) {
                return 'CreateWarning.html';
            }
        } catch (e) {
            console.error("خطأ في قراءة التوكن:", e);
        }
        // المسار الافتراضي لأي موظف عادي أو أدمن
        return 'dashboard.html'; 
    }

    // لو اليوزر أصلاً معاه توكن (يعني عامل لوجين قبل كده)، نحوله بذكاء فوراً للصفحة بتاعته
    const existingToken = localStorage.getItem('ApiToken');
    if (existingToken) {
        window.location.href = getRedirectUrl(existingToken);
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // عشان الصفحة متعملش ريفريش

        // نسحب الإيميل والباسورد اللي اليوزر كتبهم
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // شوية حركات للـ UX: نقفل الزرار ونكتب "جاري التحميل"
        loginBtn.disabled = true;
        loginBtn.innerHTML = '⏳ جاري تسجيل الدخول...';
        errorMessage.style.display = 'none';

        // 💡 نستخدم المحرك بتاعنا اللي عملناه في apiService.js
        const response = await apiRequest('/Auth/Login', 'POST', { email, password });

        if (response.ok && response.data.token) {
            // اللوجين نجح!
            
            // 1. نتأكد إنه أدمن أو موظف
            const role = response.data.role;
            if (role === 'Citizen' || !role) {
                showError('عذراً، هذه البوابة مخصصة للموظفين والإداريين فقط.');
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'تسجيل الدخول';
                return;
            }

            // 2. نخزن التوكن في الخزنة (localStorage)
            localStorage.setItem('ApiToken', response.data.token);
            
            // بنخزن الـ Role أوتوماتيك أول ما يدخل
            localStorage.setItem('userRole', role);
            
            // 3. 🚀 التوجيه الذكي للصفحة المناسبة حسب الفريق
            window.location.href = getRedirectUrl(response.data.token);
        } else {
            // اللوجين فشل (إيميل أو باسورد غلط)
            showError('❌ خطأ في البريد الإلكتروني أو كلمة المرور');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'تسجيل الدخول';
        }
    });

    function showError(msg) {
        errorMessage.innerText = msg;
        errorMessage.style.display = 'block';
    }
});