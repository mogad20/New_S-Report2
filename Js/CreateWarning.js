// 1. دالة جلب المدن (معدلة لتجنب خطأ forEach)
async function loadCities() {
    try {
        const response = await apiRequest('/General/Cities', 'GET');
        
        const citiesArray = Array.isArray(response) ? response : (response.data || response.result || []);

        if (citiesArray.length > 0) {
            const select = $('#citySelect');
            select.empty(); 
            citiesArray.forEach(city => {
                select.append(new Option(city.name, city.id));
            });
            select.select2({ dir: "rtl", width: '100%', placeholder: "اختر المدن..." });
        } else {
            console.warn("الـ API لم يرجع مدن، تأكد من الـ Endpoint");
        }
    } catch (error) {
        console.error("خطأ كارثي في جلب المدن:", error);
    }
}

// 2. دالة إرسال التحذير (POST)
async function submitWarning(warningData) {
    try {
        const response = await apiRequest('/Notification/Multiple_Cities', 'POST', warningData);
        if (response) {
            alert("تم بث التحذير للمدن بنجاح! 🚀");
            window.location.href = 'CityNotifications.html';
        }
    } catch (error) {
        console.error("Error broadcasting warning:", error);
        alert("فشل في إرسال التحذير، حاول مرة أخرى.");
    }
}

// 3. التنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تحميل المدن
    loadCities();

    // الـ Submit Event
    const warningForm = document.getElementById('warningForm');
    if (warningForm) {
        warningForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const warningData = {
                Title: document.getElementById('title').value,
                Body: document.getElementById('body').value,
                CityIDs: $('#citySelect').val() // مصفوفة الـ IDs
            };

            await submitWarning(warningData);
        });
    }
});
