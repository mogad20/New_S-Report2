// ==========================================
// 1. رابط الباك إند الأساسي
// ==========================================
const BASE_URL = "https://abdallahnasrat-001-site1.anytempurl.com/api";

// ==========================================
// 2. المحرك الأساسي لأي ريكويست (GET, POST, PUT, DELETE)
// ==========================================
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('ApiToken');
    
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method: method,
        headers: headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const url = `${BASE_URL}/${cleanEndpoint}`;

        const response = await fetch(url, options);

        if (response.status === 401) {
            console.error("انتهت الجلسة، جاري تحويلك لتسجيل الدخول...");
            localStorage.removeItem('ApiToken');
            window.location.href = 'index.html'; 
            return { ok: false, status: 401, data: null };
        }

        let data;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json(); 
        } else {
            data = await response.text();
        }
        
        return { ok: response.ok, status: response.status, data: data };

    } catch (error) {
        console.error('API Request Error:', error);
        return { ok: false, status: 500, error: error.message };
    }
}

// ==========================================
// 3. دالة تفك التوكن عشان نعرف مين اليوزر وصلاحياته
// ==========================================
function getUserDataFromToken() {
    const token = localStorage.getItem('ApiToken');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("خطأ في فك التوكن:", e);
        return null;
    }
}
