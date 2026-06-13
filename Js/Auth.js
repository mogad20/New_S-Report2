document.addEventListener('DOMContentLoaded', () => {
    
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
        return 'Dashboard.html'; 
    }

    const existingToken = localStorage.getItem('ApiToken');
    if (existingToken) {
        window.location.href = getRedirectUrl(existingToken);
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '⏳ جاري تسجيل الدخول...';
        errorMessage.style.display = 'none';

        try {
            const response = await apiRequest('/Auth/Login', 'POST', { email, password });

            if (response.ok && response.data.token) {
                
                let role = response.data.role;
                
                // لو الباك إند مش بيبعت الـ role صراحة، هنفكه من التوكن
                if (!role) {
                    try {
                        const base64Url = response.data.token.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));
                        const userData = JSON.parse(jsonPayload);
                        role = userData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || userData.role || userData.Role || '';
                    } catch(e) { console.error("Error decoding token for role", e); }
                }

                let safeRole = (role || '').toString().toLowerCase();

                if (safeRole === 'citizen' || safeRole === 'user' || safeRole === 'مواطن' || safeRole === '') {
                    showError('تسجيل الدخول خاص للكوادر والموظفين.');
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = 'تسجيل الدخول';
                    return; // نوقف الكود هنا والـ Redirect مش هيشتغل
                }

                localStorage.setItem('ApiToken', response.data.token);
                
                localStorage.setItem('userRole', role);
                
                window.location.href = getRedirectUrl(response.data.token);
            } else {
                showError('❌ خطأ في البريد الإلكتروني أو كلمة المرور');
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'تسجيل الدخول';
            }
        } catch (error) {
            console.error("خطأ تم التقاطه بواسطة الـ Catch:", error);
            showError(`❌ حدث خطأ: ${error.message || 'لا يمكن الاتصال بالسيرفر'}`);
            
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'تسجيل الدخول';
        }
    });

    function showError(msg) {
        errorMessage.innerText = msg;
        errorMessage.style.display = 'block';
    }
});
