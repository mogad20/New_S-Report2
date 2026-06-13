document.addEventListener('DOMContentLoaded', () => {
    loadMyProfile();
});

const alertMessage = document.getElementById('alertMessage');
let currentUserCityId = 0; 
// 1. دالة جلب وعرض بيانات الموظف
async function loadMyProfile() {
    try {
        const response = await apiRequest('User', 'GET');
        
        if (response && response.ok) {
            let userData = response.data;
            if (userData && userData.$values) userData = userData.$values;

            // تعبئة فورم البيانات
            document.getElementById('firstName').value = userData.firstName || userData.FirstName || '';
            document.getElementById('secoundName').value = userData.secoundName || userData.SecoundName || '';
            document.getElementById('phone').value = userData.phone || userData.Phone || '';
            document.getElementById('address').value = userData.address || userData.Address || '';
            document.getElementById('email').value = userData.email || userData.Email || '';
            document.getElementById('nationalId').value = userData.nationalId || userData.NationalId || '';
            
            currentUserCityId = userData.cityId || userData.CityId || 0;
            
            // تظبيط شكل البروفايل من فوق
            const fName = userData.firstName || userData.FirstName || 'بدون';
            const sName = userData.secoundName || userData.SecoundName || 'اسم';
            document.getElementById('displayName').textContent = `${fName} ${sName}`;
            document.getElementById('avatarLetter').textContent = fName.charAt(0).toUpperCase();
            
            // تحديد الـ Role عشان نكتبها تحت الاسم
            const role = localStorage.getItem('userRole') || userData.role || 'موظف';
            document.getElementById('displayRole').textContent = role === 'Admin' ? 'مدير النظام (Admin)' : 'موظف (Employee)';

        } else {
            showAlert('حدث خطأ أثناء جلب البيانات', 'danger');
        }
    } catch (error) {
        console.error(error);
        showAlert('تعذر الاتصال بالسيرفر', 'danger');
    }
}

// 2. دالة حفظ التعديلات (تحديث البروفايل)
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // منع الريفريش

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

    const updatedData = {
        firstName: document.getElementById('firstName').value,
        secondName: document.getElementById('secoundName').value,
        phone: document.getElementById('phone').value,
        homeAddress: document.getElementById('address').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        cityId: currentUserCityId
    };

   try {
        const response = await apiRequest('User/UserData', 'PUT', updatedData);
        
        if (response.ok) {
            showAlert('تم حفظ التعديلات بنجاح! ✅', 'success');
            document.getElementById('displayName').textContent = `${updatedData.firstName} ${updatedData.secondName}`;
        } else {
            let errorText = 'فشل في حفظ التعديلات';
            if (response.data) {
                if (typeof response.data === 'string') {
                    errorText = response.data;
                } else if (response.data.message) {
                    errorText = response.data.message;
                } else if (response.data.errors) {
                    errorText = JSON.stringify(response.data.errors);
                } else {
                    errorText = JSON.stringify(response.data);
                }
            }
            showAlert(errorText, 'danger');
        }
    } catch (error) {
        showAlert('خطأ في الاتصال بالسيرفر', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> حفظ التعديلات';
    }
});

// 3. التحكم في زرار تشغيل/إيقاف الإشعارات
document.getElementById('notificationToggle').addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    
    try {
        const response = await apiRequest('User/toggle-notifications', 'PATCH', { 
            status: isChecked 
        });
        
        if (response.ok) {
            showAlert(isChecked ? 'تم تفعيل الإشعارات بنجاح 🔔' : 'تم إيقاف الإشعارات 🔕', 'info');
        } else {
            e.target.checked = !isChecked;
            showAlert('فشل في تعديل حالة الإشعارات', 'danger');
        }
    } catch (error) {
        console.error("خطأ:", error);
        e.target.checked = !isChecked;
        showAlert('تعذر الاتصال بالسيرفر لتعديل الإشعارات', 'danger');
    }
});

function showAlert(message, type) {
    alertMessage.className = `alert alert-${type} shadow-sm border-0 mb-4`;
    alertMessage.textContent = message;
    alertMessage.classList.remove('d-none');
    
    setTimeout(() => {
        alertMessage.classList.add('d-none');
    }, 4000);
}
