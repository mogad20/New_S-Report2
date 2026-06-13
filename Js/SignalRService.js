let signalRConnection = null;

async function startSignalRConnection() {
    const token = localStorage.getItem('ApiToken');
    if (!token) return;

    let cityId = "";
    let role = "";
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        cityId = payload.cityId || payload['cityId'] || "";
        role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || "";
    } catch (e) { 
        console.warn("خطأ في قراءة التوكن للـ SignalR"); 
    }

    const hubUrl = "https://abdallahnasrat-001-site1.anytempurl.com/reportHub"; 

    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { 
            accessTokenFactory: () => token 
        })
        .withAutomaticReconnect()
        .build();

    signalRConnection.on("RefreshReports", () => {
        console.log("🔔 SignalR: إشعار جديد وصل! جاري تحديث الداشبورد...");
        
        const event = new Event("newReportArrived");
        window.dispatchEvent(event);
    });

    try {
        await signalRConnection.start();
        console.log("✅ SignalR Connected Successfully!");

        if (role === "Admin" || role === "admin") {
            console.log(" You are Admin. Joining ALL city groups...");
            for (let i = 1; i <= 30; i++) { // افترضنا إن عدد المحافظات/المدن 30
                await signalRConnection.invoke("JoinCityGroup", i.toString());
            }
            console.log("✅ Admin successfully joined all city groups!");
        } 
        else if (cityId) {
            await signalRConnection.invoke("JoinCityGroup", cityId.toString());
            console.log(`✅ Joined SignalR Group for City: ${cityId}`);
        } else {
            console.warn("⚠️ لم يتم العثور على City ID في التوكن.");
        }

    } catch (err) {
        console.error("❌ SignalR Connection Error: ", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof signalR !== 'undefined') {
        startSignalRConnection();
    } else {
        console.warn("⚠️ لم يتم العثور على مكتبة SignalR في ملف الـ HTML.");
    }
});

window.addEventListener("newReportArrived", () => {
    console.log("🔄 جاري سحب البلاغات الجديدة من السيرفر بدون ريفريش...");
    
    if (typeof showAlert === "function") {
        showAlert('يوجد تحديث جديد في البلاغات! 🚀', 'info');
    }

    if (typeof checkRoleAndLoad === "function") {
        checkRoleAndLoad(); 
    } else {
        console.error("❌ مش قادر ألاقي دالة تحديث الجدول (checkRoleAndLoad)!");
    }
});
