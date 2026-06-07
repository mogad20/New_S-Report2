let signalRConnection = null;

async function startSignalRConnection() {
    // 1. جلب التوكن
    const token = localStorage.getItem('ApiToken');
    if (!token) return;

    // 2. استخراج الـ cityId والـ Role من التوكن
    let cityId = "";
    let role = "";
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        cityId = payload.cityId || payload['cityId'] || "";
        // استخراج الصلاحية لمعرفة إذا كان اليوزر أدمن
        role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || "";
    } catch (e) { 
        console.warn("خطأ في قراءة التوكن للـ SignalR"); 
    }

    // مسار الـ Hub الحقيقي بتاعك على السيرفر
    const hubUrl = "https://abdallahnasrat-001-site1.anytempurl.com/reportHub"; 

    // 3. بناء الاتصال بالسيرفر
    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { 
            accessTokenFactory: () => token 
        })
        .withAutomaticReconnect()
        .build();

    // 4. الاستماع لـ "RefreshReports" اللي الباك إند بيبعتها
    signalRConnection.on("RefreshReports", () => {
        console.log("🔔 SignalR: إشعار جديد وصل! جاري تحديث الداشبورد...");
        
        // إطلاق حدث عشان الداشبورد تسمعه وتحدث الجداول
        const event = new Event("newReportArrived");
        window.dispatchEvent(event);
    });

    // 5. تشغيل الاتصال
    try {
        await signalRConnection.start();
        console.log("✅ SignalR Connected Successfully!");

        // 💡 6. الانضمام لجروب المدينة بناءً على الصلاحية
        if (role === "Admin" || role === "admin") {
            // لو أدمن: ينضم لكل محافظات مصر (عشان يشوف أي بلاغ جديد في أي مكان)
            console.log("👑 You are Admin. Joining ALL city groups...");
            for (let i = 1; i <= 30; i++) { // افترضنا إن عدد المحافظات/المدن 30
                await signalRConnection.invoke("JoinCityGroup", i.toString());
            }
            console.log("✅ Admin successfully joined all city groups!");
        } 
        else if (cityId) {
            // لو موظف عادي: ينضم لمدينته فقط
            await signalRConnection.invoke("JoinCityGroup", cityId.toString());
            console.log(`✅ Joined SignalR Group for City: ${cityId}`);
        } else {
            console.warn("⚠️ لم يتم العثور على City ID في التوكن.");
        }

    } catch (err) {
        console.error("❌ SignalR Connection Error: ", err);
    }
}

// تشغيل الاتصال بمجرد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    if (typeof signalR !== 'undefined') {
        startSignalRConnection();
    } else {
        console.warn("⚠️ لم يتم العثور على مكتبة SignalR في ملف الـ HTML.");
    }
});

// 💡 7. التعديل الأهم: الاستماع للإشعار وتحديث الداشبورد أوتوماتيك (بدون ريفريش)
window.addEventListener("newReportArrived", () => {
    console.log("🔄 جاري سحب البلاغات الجديدة من السيرفر بدون ريفريش...");
    
    // إظهار تنبيه للموظف إن في حاجة جديدة
    if (typeof showAlert === "function") {
        showAlert('يوجد تحديث جديد في البلاغات! 🚀', 'info');
    }

    // مناداة دالة تحديث الجدول والخريطة فوراً
    if (typeof checkRoleAndLoad === "function") {
        checkRoleAndLoad(); 
    } else {
        console.error("❌ مش قادر ألاقي دالة تحديث الجدول (checkRoleAndLoad)!");
    }
});