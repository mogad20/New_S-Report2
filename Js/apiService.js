// ==========================================
// 1. رابط الباك إند الأساسي (عشان منكتبوش كل شوية)
// ==========================================
const BASE_URL = "https://abdallahnasrat-001-site1.anytempurl.com/api";

// ==========================================
// 2. المحرك الأساسي لأي ريكويست (GET, POST, PUT, DELETE)
// ==========================================
async function apiRequest(endpoint, method = 'GET', body = null) {
    // بنسحب التوكن من خزنة المتصفح
    const token = localStorage.getItem('ApiToken');
    
    // بنجهز الهيدر الأساسي
    const headers = {
        'Content-Type': 'application/json'
    };

    // لو فيه توكن، الزقه في الهيدر أوتوماتيك
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method: method,
        headers: headers
    };

    // لو فيه داتا مبعوتة (زي اللوجين أو تعديل حالة)، حطها في الـ Body
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        // التعديل الذكي هنا: بنضمن إن الـ endpoint مفيش سلاش في أولها وبنضيف الـ / أوتوماتيك
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const url = `${BASE_URL}/${cleanEndpoint}`;

        // بنضرب الريكويست للباك إند
        const response = await fetch(url, options);

        // 🚨 حماية أوتوماتيك: لو التوكن منتهي أو مضروب (401)، اطرده بره للوجين
        if (response.status === 401) {
            console.error("انتهت الجلسة، جاري تحويلك لتسجيل الدخول...");
            localStorage.removeItem('ApiToken');
            window.location.href = 'index.html'; // هنفترض إن دي صفحة اللوجين
            return { ok: false, status: 401, data: null };
        }

        // تحويل النتيجة لـ JSON
      // 💡 التعديل هنا: بنسأل السيرفر الأول، الداتا اللي راجعة JSON ولا نص عادي؟
        let data;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json(); // لو JSON افكها عادي
        } else {
            data = await response.text(); // لو نص عادي (زي رسالة النجاح بتاعتك) اقرأها كنص
        }
        
        return { ok: response.ok, status: response.status, data: data };

    } catch (error) {
        console.error('API Request Error:', error);
        return { ok: false, status: 500, error: error.message };
    }
}

// ==========================================
// 3. دالة تفك التوكن عشان نعرف مين اليوزر وصلاحياته (بدون الباك إند)
// ==========================================
function getUserDataFromToken() {
    const token = localStorage.getItem('ApiToken');
    if (!token) return null;

    try {
        // التوكن عبارة عن 3 أجزاء بينهم نقطة، الـ Payload هو الجزء اللي في النص (رقم 1)
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