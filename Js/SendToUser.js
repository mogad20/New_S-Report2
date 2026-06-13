
// 1. دالة إرسال الإشعار
async function submitUserNotification(notificationData) {
    try {
        const response = await apiRequest('Notification/user', 'POST', notificationData);
        
        if (response && response.ok) {
            alert("تم إرسال الإشعار للمواطن بنجاح! ✅");
            document.getElementById('notificationForm').reset(); 
        } else {
            console.error("السيرفر رفض الداتا:", response);
            alert("فشل الإرسال! تأكد إن رقم الـ ID صحيح.");
        }
    } catch (error) {
        console.error("Error sending notification:", error);
        alert("حدث خطأ أثناء إرسال الإشعار.");
    }
}

// 2. التنفيذ لما تدوس "إرسال"
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('notificationForm');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const inputValue = document.getElementById('userIdInput').value;

            const data = {
                UserId: parseInt(inputValue), 
                Title: document.getElementById('title').value,
                Body: document.getElementById('body').value
            };

            if (!data.UserId || isNaN(data.UserId)) {
                alert("خطأ: يرجى إدخال رقم ID صحيح!");
                return;
            }

            console.log("جاري الإرسال للمواطن رقم:", data.UserId);
            await submitUserNotification(data);
        });
    }
});
async function loadReporters() {
    try {
        const response = await apiRequest('Report/CityReports?page=1&size=1000', 'GET'); 
        
        if (response && response.ok) {
            const reports = response.data.$values || response.data;
            const select = document.getElementById('userSelect');
            
            const uniqueReporters = new Map();
            reports.forEach(r => {
                const id = r.reporterId || r.ReporterId;
                const name = r.reporterName || r.ReporterName;
                if (id && !uniqueReporters.has(id)) {
                    uniqueReporters.set(id, name);
                }
            });

           let options = '<option value="">-- اختر مواطن قام بتقديم بلاغ --</option>';
            uniqueReporters.forEach((name, id) => {
                options += `<option value="${id}">${name} (ID: ${id})</option>`;
            });
            
            select.innerHTML = options;

            $(select).select2({
                placeholder: "ابحث عن مُبلغ بالاسم أو الـ ID...",
                allowClear: true
            });

            $(select).on('change', function() {
                document.getElementById('userIdInput').value = this.value;
            });
        }
        
    } catch (error) {
        console.error("خطأ في جلب المبلّغين:", error);
    }
}

// استدعيها في الـ DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadReporters(); // بدل loadAllUsers
    // ... باقي الكود
});
