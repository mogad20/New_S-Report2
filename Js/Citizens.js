document.addEventListener('DOMContentLoaded', () => {
    loadCitizensData();
});

// متغيرات عشان نحفظ الداتا للـ Modal
let globalCitizensList = [];
let currentAdminStatus = false;

async function loadCitizensData() {
    const tableBody = document.getElementById('citizensTableBody');
    const countSpan = document.getElementById('citizensCount');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    try {
        const profileRes = await apiRequest('User/All?page=1&size=1000', 'GET');
        
        let canSeeAll = false;
        let isAdmin = false;

        if (profileRes && profileRes.ok) {
            let profileData = profileRes.data;
            if (profileData && profileData.$values) profileData = profileData.$values;

            console.log("🔥 بيانات المستخدم الحالي:", profileData);

            isAdmin = (
                profileData.role === 'Admin' || 
                profileData.Role === 'Admin' || 
                (profileData.role && profileData.role.toLowerCase() === 'admin') ||
                profileData.roleId === 1 || 
                profileData.RoleId === 1 ||
                localStorage.getItem('userRole') === 'Admin'
            );
            
            currentAdminStatus = isAdmin; // حفظناها عشان النافذة

            const myCityId = profileData.cityId || profileData.CityId || 0;
            const myTeamId = profileData.teamId || profileData.TeamId || 0;

            if (isAdmin || myCityId === 30 || myTeamId === 35) {
                canSeeAll = true;
                console.log("✅ تم التعرف عليك كأدمن/عمليات.. سيتم جلب الكل!");
            }
        } else {
            console.warn("مقدرناش نجيب بروفايل المستخدم.");
        }

        // 💡 ضفنا الـ page والـ size في المسارين عشان يجيب كل الداتا سواء أدمن أو موظف
const endpoint = canSeeAll ? 'User/All?page=1&size=1000' : 'User/InCity?page=1&size=50';
        console.log(`جاري جلب المواطنين من مسار: ${endpoint}`);

        const citizensRes = await apiRequest(endpoint, 'GET');

        if (citizensRes && citizensRes.ok) {
            let citizens = citizensRes.data;
            if (citizens && citizens.$values) citizens = citizens.$values;
            if (!Array.isArray(citizens)) citizens = [citizens];

            globalCitizensList = citizens; // حفظنا الداتا
            countSpan.textContent = citizens.length;
            tableBody.innerHTML = ''; 

            if (citizens.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-5">
                            <div class="opacity-50">
                                <i class="fa-solid fa-user-slash fa-4x mb-3"></i>
                                <h5 class="fw-bold">لا يوجد بيانات لعرضها</h5>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            citizens.forEach(user => {
                const userId = user.id || user.Id; // مهم عشان مسار الحظر
                const fName = user.firstName || user.FirstName || "";
                const sName = user.secoundName || user.SecoundName || "";
                let fullName = (fName || sName) ? `${fName} ${sName}`.trim() : "بدون اسم";
                const firstLetter = fullName.charAt(0).toUpperCase();
                
                const email = user.email || user.Email || "لا يوجد إيميل";
                const nationalId = user.nationalId || user.NationalId || "غير محدد";
                const phone = user.phone || user.Phone || "غير محدد";
                const address = user.address || user.Address || "غير محدد";
                const isVolunteer = user.volunteer || user.Volunteer || false;

                // 💡 التعديل هنا: دمج زرار الحذف بتاعك مع زرار التفاصيل الجديد
                let actionHtml = '';
                actionHtml += `
                    <button onclick="openCitizenModal('${userId || nationalId}')" class="btn btn-sm btn-primary shadow-sm rounded-pill px-3">
                        تفاصيل
                    </button>
                `;

                const statusHtml = isVolunteer 
                    ? `<span class="badge rounded-pill bg-success px-3">متطوع</span>`
                    : `<span class="badge rounded-pill bg-secondary px-3">مواطن</span>`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="ps-4">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex justify-content-center align-items-center me-2 fw-bold"
                                 style="width: 42px; height: 42px; border: 2px solid;">
                                ${firstLetter}
                            </div>
                            <div>
                                <span class="d-block fw-bold">${fullName}</span>
                                <small class="text-muted">${email}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${nationalId}</span></td>
                    <td><div class="small"><i class="fa-solid fa-phone me-1 text-success"></i> ${phone}</div></td>
                    <td><small class="text-muted"><i class="fa-solid fa-map-pin me-1 text-danger"></i> ${address}</small></td>
                    <td class="text-center">${statusHtml}</td>
                    <td class="text-center">${actionHtml}</td>
                `;
                tableBody.appendChild(tr);
            });

        } else {
            throw new Error(citizensRes?.data || "السيرفر رفض الطلب");
        }

    } catch (error) {
        console.error("خطأ:", error);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">فشل تحميل البيانات.</td></tr>`;
        errorMessage.textContent = `حدث خطأ أثناء جلب البيانات: ${error.message}`;
        errorAlert.classList.remove('d-none');
    }
}

// دالة الحذف الأصلية بتاعتك
async function deleteCitizen(nationalId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
        const response = await apiRequest(`User/${nationalId}`, 'DELETE');
        if (response && response.ok) {
            alert('تم الحذف بنجاح!');
            loadCitizensData(); 
        } else {
            alert('فشل الحذف!');
        }
    } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء الحذف.');
    }
}

// ==========================================
// 💡 دوال النافذة المنبثقة والحظر (الجديدة)
// ==========================================

function openCitizenModal(identifier) {
    const user = globalCitizensList.find(u => (u.id == identifier || u.Id == identifier || u.nationalId == identifier || u.NationalId == identifier));
    if (!user) return;

    const fName = user.firstName || user.FirstName || "";
    const sName = user.secoundName || user.SecoundName || "";
    const fullName = (fName || sName) ? `${fName} ${sName}`.trim() : "بدون اسم";
    
    document.getElementById('modalUserName').textContent = fullName;
    document.getElementById('modalUserAvatar').textContent = fullName.charAt(0).toUpperCase();
    document.getElementById('modalUserEmail').textContent = user.email || user.Email || "لا يوجد";
    document.getElementById('modalUserNationalId').textContent = user.nationalId || user.NationalId || "غير محدد";
    document.getElementById('modalUserPhone').textContent = user.phone || user.Phone || "غير محدد";
    document.getElementById('modalUserAddress').textContent = user.address || user.Address || "غير محدد";

    const isVolunteer = user.volunteer || user.Volunteer || false;
    document.getElementById('modalUserStatus').textContent = isVolunteer ? "متطوع" : "مواطن";
    document.getElementById('modalUserStatus').className = isVolunteer ? "badge bg-success mt-2" : "badge bg-secondary mt-2";

    // داخل دالة openCitizenModal
if (currentAdminStatus) {
    document.getElementById('adminActionsSection').classList.remove('d-none');
    const blockBtn = document.getElementById('blockBtn');

    // تحديث شكل الزرار (حظر أو فك حظر)
    const isBlocked = user.isBlocked || user.IsBlocked || user.blocked || user.Blocked || false;
    
    blockBtn.className = isBlocked ? "btn btn-outline-secondary w-100 fw-bold shadow-sm py-2" : "btn btn-outline-danger w-100 fw-bold shadow-sm py-2";
    blockBtn.innerHTML = isBlocked ? '<i class="fa-solid fa-unlock me-1"></i> فك الحظر' : '<i class="fa-solid fa-ban me-1"></i> حظر المواطن';
    
    // ربط الدالة بالزرار (استخدام userId اللي جبناه من البحث)
    blockBtn.onclick = function() {
        toggleBlockUser(userId, isBlocked ? 'Unblock' : 'block');
    };
} else {
    document.getElementById('adminActionsSection').classList.add('d-none');
}

    const modal = new bootstrap.Modal(document.getElementById('citizenDetailsModal'));
    modal.show();
}

async function toggleBlockUser(userId, action) {
    if (!userId) {
        alert('معرف المستخدم غير متاح للحظر.');
        return;
    }
    const isBlocking = action === 'block';
    if (!confirm(`هل أنت متأكد من ${isBlocking ? 'حظر' : 'فك حظر'} هذا المواطن؟`)) return;

    const btn = document.getElementById('blockBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التنفيذ...';
    btn.disabled = true;

    try {
        const response = await apiRequest(`User/${userId}/${action}`, 'PATCH');

        if (response.ok) {
            alert(`تم ${isBlocking ? 'حظر' : 'فك حظر'} المواطن بنجاح!`);
            btn.className = isBlocking ? "btn btn-outline-secondary flex-grow-1 fw-bold shadow-sm" : "btn btn-outline-danger flex-grow-1 fw-bold shadow-sm";
            btn.innerHTML = isBlocking ? '<i class="fa-solid fa-unlock me-1"></i> فك الحظر' : '<i class="fa-solid fa-ban me-1"></i> حظر المواطن';
            btn.onclick = () => toggleBlockUser(userId, isBlocking ? 'Unblock' : 'block');
        } else {
            alert('حدث خطأ أثناء تنفيذ الإجراء.');
        }
    } catch (error) {
        alert('تعذر الاتصال بالسيرفر.');
    } finally {
        btn.disabled = false;
    }
}

async function toggleVolunteer(userId) {
    if (!userId) {
        alert('معرف المستخدم غير متاح.');
        return;
    }
    if (!confirm('هل تريد تغيير حالة التطوع لهذا المواطن؟')) return;
    
    try {
        const response = await apiRequest('User/toggle-Volunteer', 'PATCH', { userId: userId });
        if (response.ok) {
            alert('تم تغيير حالة التطوع بنجاح! سيتم تحديث الجدول.');
            location.reload(); 
        } else {
            alert('فشل في تغيير الحالة.');
        }
    } catch (error) {
        alert('حدث خطأ في الاتصال.');
    }
}