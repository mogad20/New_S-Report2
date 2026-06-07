document.addEventListener('DOMContentLoaded', () => {
    loadLookups().then(() => {
        loadEmployees(); // تحميل الجدول بعد ما نجيب المدن والفرق
    });
});

let citiesMap = {};
let teamsMap = {};

// 1. جلب المدن والفرق لتعبئة القوائم والترجمة في الجدول
async function loadLookups() {
    try {
        // المدن
        const citiesRes = await apiRequest('General/Cities', 'GET');
        const citySelect = document.getElementById('cityId');
        const filterCity = document.getElementById('filterCity');
        
        let cityHtml = '<option value="">-- اختر المدينة --</option>';
        if (citiesRes && citiesRes.ok) {
            let cities = citiesRes.data.$values || citiesRes.data;
            cities.forEach(c => {
                citiesMap[c.id || c.Id] = c.name || c.Name;
                cityHtml += `<option value="${c.id || c.Id}">${c.name || c.Name}</option>`;
                filterCity.innerHTML += `<option value="${c.id || c.Id}">${c.name || c.Name}</option>`;
            });
            citySelect.innerHTML = cityHtml;
        }

        // الفِرَق
        const teamsRes = await apiRequest('Teams', 'GET');
        const teamSelect = document.getElementById('teamId');
        let teamHtml = '<option value="0">-- بدون فريق --</option>';
        if (teamsRes && teamsRes.ok) {
            let teams = teamsRes.data.$values || teamsRes.data;
            teams.forEach(t => {
                teamsMap[t.id || t.Id] = t.name || t.Name;
                teamHtml += `<option value="${t.id || t.Id}">${t.name || t.Name}</option>`;
            });
            teamSelect.innerHTML = teamHtml;
        }
    } catch (error) { console.error("خطأ في القوائم المساعدة", error); }
}

// 2. تحميل الموظفين (بتشغل مسار All أو مسار الفلتر حسب الـ cityId)
async function loadEmployees(cityId = null) {
    const tableBody = document.getElementById('employeesTableBody');
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
    
    // 💡 استخدام الـ APIs: لو في مدينة بننادي مسار الفلتر، لو مفيش بننادي مسار الكل
    const endpoint = cityId ? `Employee/${cityId}/All` : 'Employee/All';
    
    try {
        const response = await apiRequest(endpoint, 'GET');
        if (response && response.ok) {
            let emps = response.data.$values || response.data;
            document.getElementById('empCount').textContent = emps.length;
            tableBody.innerHTML = '';

            if (emps.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">لا يوجد موظفين لعرضهم.</td></tr>`;
                return;
            }

            emps.forEach(emp => {
                const id = emp.employeeId || emp.EmployeeId || emp.id || emp.Id;
                const fName = emp.firstName || emp.FirstName || '';
                const sName = emp.secoundName || emp.secondName || emp.SecondName || '';
                const fullName = `${fName} ${sName}`;
                const email = emp.email || emp.Email;
                const phone = emp.phone || emp.Phone;
                const nationalId = emp.nationalId || emp.NationalId;
                
                const cId = emp.cityId || emp.CityId;
                const cityName = citiesMap[cId] || 'غير محدد';
                
                const tId = emp.teamId || emp.TeamId;
                const teamName = tId > 0 ? (teamsMap[tId] || 'فريق غير معروف') : '<span class="text-muted">بدون فريق</span>';

                tableBody.innerHTML += `
                    <tr>
                        <td class="ps-4">
                            <div class="d-flex align-items-center">
                                <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex justify-content-center align-items-center me-3 fw-bold" style="width: 40px; height: 40px;">
                                    ${fName.charAt(0)}
                                </div>
                                <div>
                                    <span class="d-block fw-bold text-dark">${fullName}</span>
                                    <small class="text-muted">${email}</small>
                                </div>
                            </div>
                        </td>
                        <td><span class="badge bg-light text-dark border">${nationalId}</span></td>
                        <td><div class="small fw-bold"><i class="fa-solid fa-phone text-success me-1"></i>${phone}</div></td>
                        <td>
                            <div class="small"><i class="fa-solid fa-map-pin text-danger me-1"></i>${cityName}</div>
                            <div class="small mt-1"><i class="fa-solid fa-users text-info me-1"></i>${teamName}</div>
                        </td>
                        <td class="text-center">
                            <button onclick="openEmployeeModal(${id})" class="btn btn-sm btn-outline-primary shadow-sm rounded-pill px-3">
                                <i class="fa-solid fa-pen me-1"></i> تعديل
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">فشل تحميل الموظفين</td></tr>`;
    }
}

// تشغيل الفلتر لما نختار مدينة من الـ Dropdown
function filterByCity() {
    const cityId = document.getElementById('filterCity').value;
    loadEmployees(cityId);
}

// 3. فتح نافذة الإضافة أو التعديل (بتشغل GET /api/Employee/{id})
async function openEmployeeModal(id) {
    const form = document.getElementById('employeeForm');
    const modalTitle = document.getElementById('modalTitle');
    const passContainer = document.getElementById('passwordContainer');
    const roleContainer = document.getElementById('roleContainer');
    
    form.reset();
    document.getElementById('empId').value = id;

    if (id === 0) {
        // وضع الإضافة (POST)
        modalTitle.innerHTML = '<i class="fa-solid fa-user-plus me-2"></i> تسجيل موظف جديد';
        passContainer.classList.remove('d-none');
        document.getElementById('password').required = true;
        roleContainer.classList.add('d-none');
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    } else {
        // وضع التعديل (PUT)
        modalTitle.innerHTML = '<i class="fa-solid fa-user-pen me-2"></i> تعديل بيانات الموظف';
        passContainer.classList.add('d-none');
        document.getElementById('password').required = false;
        roleContainer.classList.remove('d-none');
        
        // 💡 استخدام مسار جلب موظف واحد
        try {
            const res = await apiRequest(`Employee/${id}`, 'GET');
            if (res && res.ok) {
                let emp = res.data;
                document.getElementById('firstName').value = emp.firstName || emp.FirstName || '';
                document.getElementById('secondName').value = emp.secondName || emp.SecondName || emp.secoundName || '';
                document.getElementById('nationalId').value = emp.nationalId || emp.NationalId || '';
                
                // تظبيط التاريخ للـ input type date
                const bDate = emp.birthdate || emp.Birthdate;
                if(bDate) document.getElementById('birthdate').value = bDate.split('T')[0];
                
                document.getElementById('gender').value = emp.gender || emp.Gender || 'Male';
                document.getElementById('phone').value = emp.phone || emp.Phone || '';
                document.getElementById('address').value = emp.homeAddress || emp.HomeAddress || '';
                document.getElementById('email').value = emp.email || emp.Email || '';
                document.getElementById('cityId').value = emp.cityId || emp.CityId || '';
                document.getElementById('teamId').value = emp.teamId || emp.TeamId || 0;
                document.getElementById('salary').value = emp.salary || emp.Salary || 0;
                document.getElementById('roleId').value = emp.roleId || emp.RoleId || 2;
                
                new bootstrap.Modal(document.getElementById('employeeModal')).show();
            } else {
                showAlert('فشل جلب بيانات الموظف للتعديل', 'danger');
            }
        } catch(e) { showAlert('خطأ في الاتصال', 'danger'); }
    }
}

// 4. حفظ البيانات (POST أو PUT)
document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveEmpBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    btn.disabled = true;

    const id = document.getElementById('empId').value;
    const isEdit = id != 0;

    // تجميع الداتا الأساسية اللي مشتركة بين الـ Add والـ Update
    let payload = {
        nationalId: document.getElementById('nationalId').value,
        firstName: document.getElementById('firstName').value,
        secondName: document.getElementById('secondName').value,
        homeAddress: document.getElementById('address').value,
        email: document.getElementById('email').value,
        salary: parseInt(document.getElementById('salary').value),
        phone: document.getElementById('phone').value,
        gender: document.getElementById('gender').value,
        birthdate: document.getElementById('birthdate').value,
        cityId: parseInt(document.getElementById('cityId').value),
        teamId: parseInt(document.getElementById('teamId').value) || 0
    };

    if (isEdit) {
        // 💡 إضافة الحقول الخاصة بالتعديل (UpdateEmployeeDto)
        payload.employeeId = parseInt(id);
        payload.roleId = parseInt(document.getElementById('roleId').value);
    } else {
        // 💡 إضافة الحقول الخاصة بالتسجيل (RegisterEmployeeDto)
        payload.password = document.getElementById('password').value;
    }

    try {
        const endpoint = isEdit ? `Employee/${id}` : 'Employee/AddEmployee';
        const method = isEdit ? 'PUT' : 'POST';
        
        const res = await apiRequest(endpoint, method, payload);

        if (res.ok) {
            showAlert(isEdit ? 'تم تحديث بيانات الموظف بنجاح! ✅' : 'تم تسجيل الموظف الجديد بنجاح! ✅', 'success');
            bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
            
            // تحديث الجدول بنفس الفلتر الحالي
            const currentCityFilter = document.getElementById('filterCity').value;
            loadEmployees(currentCityFilter);
        } else {
            let errorText = 'فشل الحفظ';
            if (res.data) errorText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            showAlert(errorText, 'danger');
        }
    } catch (e) {
        showAlert('خطأ في الاتصال بالسيرفر', 'danger');
    } finally {
        btn.innerHTML = 'حفظ البيانات';
        btn.disabled = false;
    }
});

// نظام عرض الرسايل
function showAlert(msg, type) {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show shadow-sm border-0 fw-bold" role="alert">
            ${msg}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    setTimeout(() => { container.innerHTML = ''; }, 5000);
}