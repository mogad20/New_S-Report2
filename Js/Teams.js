document.addEventListener('DOMContentLoaded', () => {
    await loadLookups(); // تحميل المدن والموظفين الأول
    loadTeams();   // تحميل الجدول
});

let citiesMap = {}; // عشان نترجم CityId لاسم المدينة في الجدول
let currentSelectedTeamId = 0; 
let allTeams = [];

// 1. تحميل القوائم المساعدة (المدن والموظفين)
async function loadLookups() {
    try {
        // تحميل المدن
        const citiesRes = await apiRequest('General/Cities', 'GET');
        if (citiesRes && citiesRes.ok) {
            const citySelect = document.getElementById('teamCity');
            citySelect.innerHTML = '<option value="">-- اختر المدينة --</option>';
            
            let cities = citiesRes.data.$values || citiesRes.data;
            cities.forEach(city => {
                citiesMap[city.id || city.Id] = city.name || city.Name;
                citySelect.innerHTML += `<option value="${city.id || city.Id}">${city.name || city.Name}</option>`;
            });
        }

        // تحميل الموظفين لربطهم
        const empRes = await apiRequest('Employee/All', 'GET');
        if (empRes && empRes.ok) {
            const empSelect = document.getElementById('assignEmployeeId');
            empSelect.innerHTML = '<option value="">-- اختر الموظف --</option>';
            
            let emps = empRes.data.$values || empRes.data;
            emps.forEach(emp => {
                const empId = emp.employeeId || emp.EmployeeId || emp.id || emp.Id;
                const fName = emp.firstName || emp.FirstName || '';
                const sName = emp.secoundName || emp.secondName || emp.SecondName || '';
                empSelect.innerHTML += `<option value="${empId}">${fName} ${sName}</option>`;
            });
        }
    } catch (error) {
        console.error("خطأ في تحميل القوائم:", error);
    }
}

// 2. تحميل جدول الفرق
async function loadTeams() {
    const tableBody = document.getElementById('teamsTableBody');
    try {
        const response = await apiRequest('Teams', 'GET');
        if (response && response.ok) {
            let teams = response.data.$values || response.data;
            allTeams = teams;
            document.getElementById('teamsCount').textContent = teams.length;
            tableBody.innerHTML = '';

            if (teams.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">لا توجد فِرَق مسجلة حتى الآن.</td></tr>`;
                return;
            }

            teams.forEach((team, index) => {
                const tId = team.id || team.Id;
                const tName = team.name || team.Name;
                const cId = team.cityId || team.CityId;
                const cityName = citiesMap[cId] || `مدينة كود ${cId}`;
                const state = team.state || team.State || 'Available';

                // رسم حالة الفريق
                let stateHtml = '';
                if (state.toLowerCase() === 'available' || state == 0) stateHtml = `<span class="badge bg-success px-3">🟢 متاح</span>`;
                else if (state.toLowerCase() === 'busy' || state == 1) stateHtml = `<span class="badge bg-danger px-3">🔴 مشغول</span>`;
                else stateHtml = `<span class="badge bg-dark px-3">⚫ محظور</span>`;

                tableBody.innerHTML += `
                    <tr>
                        <td class="ps-4 fw-bold text-muted">${index + 1}</td>
                        <td class="fw-bold">${tName}</td>
                        <td>${cityName}</td>
                        <td class="text-center">${stateHtml}</td>
                        <td class="text-center">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-light border shadow-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="fa-solid fa-gear text-secondary"></i> إدارة
                                </button>
                                <ul class="dropdown-menu shadow-sm border-0">
                                    <li><a class="dropdown-item" href="#" onclick="openTeamModal(${tId})"><i class="fa-solid fa-pen text-warning me-2"></i> تعديل الفريق</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="openAssignModal(${tId}, '${tName}')"><i class="fa-solid fa-user-plus text-primary me-2"></i> ربط موظف</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="openStateModal(${tId}, '${state}')"><i class="fa-solid fa-traffic-light text-info me-2"></i> تغيير الحالة</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger fw-bold" href="#" onclick="blockTeam(${tId})"><i class="fa-solid fa-ban me-2"></i> حظر الفريق</a></li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">فشل جلب البيانات</td></tr>`;
    }
}

// 3. فتح نافذة الإضافة/التعديل
function openTeamModal(id = 0) {
    const modalTitle = document.getElementById('teamModalTitle');
    const form = document.getElementById('teamForm');
    
    if (id === 0) {
        modalTitle.textContent = "إضافة فريق جديد";
        form.reset();
        document.getElementById('teamId').value = "";
    } else {
        modalTitle.textContent = "تعديل الفريق";
        const team = allTeams.find(t => (t.id || t.Id) == id);
        if (team) {
            document.getElementById('teamId').value = id;
            document.getElementById('teamName').value = team.name || team.Name;
            document.getElementById('teamCity').value = team.cityId || team.CityId;
            document.getElementById('teamState').value = team.state || team.State; // للاحتفاظ بالحالة في الـ PUT
        }
    }
    new bootstrap.Modal(document.getElementById('teamModal')).show();
}

// 4. حفظ الفريق (Create أو Edit)
document.getElementById('teamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveTeamBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    btn.disabled = true;

    const id = document.getElementById('teamId').value;
    const isEdit = id !== "";

    // تطابق مع CreateTeamDTO و TeamDTO
    let payload = {
        name: document.getElementById('teamName').value,
        cityId: parseInt(document.getElementById('teamCity').value)
    };

    if (isEdit) {
        payload.id = parseInt(id);
        payload.state = document.getElementById('teamState').value || 0; // حسب متطلبات الـ PUT
    }

    try {
        const endpoint = isEdit ? `Teams/${id}` : 'Teams';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await apiRequest(endpoint, method, payload);

        if (res.ok) {
            showAlert(isEdit ? 'تم تعديل الفريق بنجاح' : 'تم إضافة الفريق بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('teamModal')).hide();
            loadTeams();
        } else {
            showAlert('فشل الحفظ: ' + JSON.stringify(res.data), 'danger');
        }
    } catch (e) {
        showAlert('خطأ في الاتصال', 'danger');
    } finally {
        btn.innerHTML = 'حفظ الفريق';
        btn.disabled = false;
    }
});

// 5. حظر الفريق
async function blockTeam(id) {
    if(!confirm("هل أنت متأكد من حظر هذا الفريق؟")) return;
    try {
        const res = await apiRequest(`Teams/${id}/block`, 'PATCH', {});
        if(res.ok) {
            showAlert('تم حظر الفريق!', 'success');
            loadTeams();
        } else showAlert('فشل الحظر', 'danger');
    } catch(e) { showAlert('خطأ في الاتصال', 'danger'); }
}

// 6. ربط موظف
function openAssignModal(teamId, teamName) {
    currentSelectedTeamId = teamId;
    document.getElementById('assignTeamName').textContent = teamName;
    document.getElementById('assignForm').reset();
    new bootstrap.Modal(document.getElementById('assignModal')).show();
}

document.getElementById('assignForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const empId = document.getElementById('assignEmployeeId').value;
    
    // تطابق AssignEmployeeToTeamDTO
    const payload = {
        employeeId: parseInt(empId),
        teamId: parseInt(currentSelectedTeamId)
    };

    try {
        const res = await apiRequest('Teams/assign-employee', 'PATCH', payload);
        if(res.ok) {
            showAlert('تم ربط الموظف بالفريق بنجاح!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('assignModal')).hide();
        } else showAlert('فشل الربط: ' + JSON.stringify(res.data), 'danger');
    } catch(e) { showAlert('خطأ في الاتصال', 'danger'); }
});

// 7. تحديث الحالة
function openStateModal(teamId, currentState) {
    currentSelectedTeamId = teamId;
    
    // تحويل القيمة لو كانت رقمية
    let stateVal = currentState;
    if(stateVal == 0) stateVal = "Available";
    if(stateVal == 1) stateVal = "Busy";
    if(stateVal == 2) stateVal = "Blocked";

    document.getElementById('newState').value = stateVal;
    new bootstrap.Modal(document.getElementById('stateModal')).show();
}

async function changeTeamState() {
    const newState = document.getElementById('newState').value;
    // تطابق UpdateTeamStateDTO
    const payload = {
        teamId: parseInt(currentSelectedTeamId),
        state: newState // أو تحويلها لرقم لو الباك إند بيطلب Enum int
    };

    try {
        const res = await apiRequest(`Teams/${currentSelectedTeamId}/state`, 'PATCH', payload);
        if(res.ok) {
            showAlert('تم تحديث حالة الفريق!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('stateModal')).hide();
            loadTeams();
        } else showAlert('فشل التحديث', 'danger');
    } catch(e) { showAlert('خطأ في الاتصال', 'danger'); }
}

// نظام الرسايل (Alerts)
function showAlert(msg, type) {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show shadow-sm border-0 fw-bold" role="alert">
            ${msg}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}
