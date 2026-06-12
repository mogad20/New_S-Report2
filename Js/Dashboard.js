document.addEventListener('DOMContentLoaded', () => {
    initMap();
    checkRoleAndLoad();
    loadLookups();
});

let map;
let markersLayer = new L.LayerGroup();
let currentSelectedReportId = 0;
let isAdmin = false;
let showResolvedOnMap = false; //  متغير للتحكم في ظهور الأرشيف على الخريطة

// تهيئة الخريطة
function initMap() {
    map = L.map('mapView').setView([26.5569, 31.6947], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markersLayer.addTo(map);
}

// فحص الصلاحيات وتحديد المسار
// فحص الصلاحيات وتحديد المسار
function checkRoleAndLoad() {
    const role = localStorage.getItem('userRole') || 'Employee'; 
    isAdmin = (role === 'Admin');

    if (isAdmin) {
        document.getElementById('btnAnalytics').classList.remove('d-none');
    }
    
    // 💡 التعديل هنا: حطينا كل المسميات (PageSize, pageSize, size) عشان الباك إند يلقطها غصب عنه
    // وخلينا الرقم 10000 عشان يجيب كل البلاغات وميوقفش عند 10
    const endpoint = isAdmin 
        ? 'Report/All?PageNumber=1&PageSize=10000&page=1&size=10000&pageSize=10000&excludeResolved=false' 
        : 'Report/CityReports?PageNumber=1&PageSize=10000&page=1&size=10000&pageSize=10000&excludeResolved=false';
        
    fetchReports(endpoint); 
}

// جلب البلاغات من السيرفر
// جلب البلاغات من السيرفر (مع فلترة ذكية للتكرار)
async function fetchReports(endpoint) {
    try {
        const noCacheUrl = endpoint.includes('?') ? `${endpoint}&t=${new Date().getTime()}` : `${endpoint}?t=${new Date().getTime()}`;
        const response = await apiRequest(noCacheUrl, 'GET');
        
        if (response && response.ok) {
            let reports = response.data.$values || response.data;
            
            // 💡 الحل الذكي: تصفية التكرار والاحتفاظ بـ "النسخة الأحدث" فقط
            let uniqueMap = new Map();

            reports.forEach(r => {
                const id = r.reportId || r.ReportId || r.id || r.Id;
                
                if (!uniqueMap.has(id)) {
                    uniqueMap.set(id, r);
                } else {
                    // لو الـ ID متكرر، هنقارن الحالة عشان نعرف مين النسخة الأحدث
                    const existing = uniqueMap.get(id);
                    
                    // دالة بتدي "وزن" للحالة (الأكبر هو الأحدث)
                    const getWeight = (obj) => {
                        const s = String(obj.reportState || obj.ReportState || obj.state || obj.State || obj.status || obj.Status).toLowerCase().trim();
                        if (s === "3" || s === "closed") return 3;
                        if (s === "2" || s === "resolved") return 2;
                        if (s === "1" || s === "inprogress") return 1;
                        return 0; // pending أو غيره
                    };

                    const weightNew = getWeight(r);
                    const weightOld = getWeight(existing);

                    // لو النسخة الجديدة حالتها متقدمة، تمسح القديمة وتكسب
                    if (weightNew > weightOld) {
                        uniqueMap.set(id, r);
                    } 
                    // لو نفس الحالة (زي إنك غيرت التصنيف بس)، بنخلي آخر نسخة تيجي من السيرفر تمسح القديمة
                    else if (weightNew === weightOld) {
                        uniqueMap.set(id, r);
                    }
                }
            });

            // نحول الـ Map لمصفوفة نظيفة مفهاش تكرار ونبعتها للجدول
            let finalReports = Array.from(uniqueMap.values());
            distributeReports(finalReports);
            
        } else {
            showAlert('فشل جلب البلاغات من السيرفر', 'danger');
        }
    } catch (e) {
        showAlert('تعذر الاتصال بالسيرفر', 'danger');
    }
}

// توزيع البلاغات (زي الداتابيز بالظبط بدون بادجات)
// توزيع البلاغات (ترجمة للعربي ودعم الدارك مود + أنيميشن البلاغ الجديد)
function distributeReports(reports) {
    const activeBody = document.getElementById('activeTableBody');
    const archiveBody = document.getElementById('archiveTableBody');
    activeBody.innerHTML = '';
    archiveBody.innerHTML = '';
    markersLayer.clearLayers();

    let cntTotal = reports.length, cntPending = 0, cntProg = 0, cntRes = 0;

    if (reports.length === 0) {
        activeBody.innerHTML = `<tr><td colspan="5" class="text-muted py-4">لا توجد بلاغات مسجلة</td></tr>`;
        return;
    }

    reports.forEach(r => {
        const id = r.reportId || r.ReportId || r.id || r.Id;
        const type = r.reportType || r.ReportType || "بلاغ غير محدد";
        const date = r.date || r.Date || r.createdAt || r.CreatedAt;
        const formattedDate = date ? date.split('T')[0] : 'غير معروف';
        const lat = r.latitude || r.Latitude;
        const lng = r.longitude || r.Longitude;

        const rawState = r.reportState !== undefined ? r.reportState : 
                        (r.ReportState !== undefined ? r.ReportState : 
                        (r.state !== undefined ? r.state : 
                        (r.State !== undefined ? r.State : 
                        (r.status !== undefined ? r.status : 
                        (r.Status !== undefined ? r.Status : "Pending")))));
        
        const stateStr = String(rawState).toLowerCase().trim();
        
        let isPending = false, isInProgress = false, isResolved = false;
        let displayStateAr = "قيد الانتظار"; 
        let pinColor = 'red';

        if (stateStr === "1" || stateStr === "inprogress") {
            isInProgress = true;
            displayStateAr = "جاري العمل";
            pinColor = 'blue'; // 🔵
            cntProg++;
        } else if (stateStr === "2" || stateStr === "resolved") {
            isResolved = true;
            displayStateAr = "تم الحل";
            pinColor = 'green'; // 🟢
            cntRes++;
        } else if (stateStr === "3" || stateStr === "closed") {
            isResolved = true;
            displayStateAr = "مغلق";
            pinColor = 'grey'; // ⚪ (لون مميز للمغلق)
            cntRes++; 
        } else {
            isPending = true;
            displayStateAr = "قيد الانتظار";
            pinColor = 'red'; // 🔴
            cntPending++;
        }

        // 💡 اللوجيك الجديد: حساب وقت البلاغ عشان نحدد هو "جديد/عاجل" ولا لأ
        let newBadge = "";
        let alertClass = "";
        
        if (date) {
            let reportDate = new Date(date);
            let now = new Date();
            let diffInMinutes = Math.abs(now.getTime() - reportDate.getTime()) / (1000 * 60);
            
            if (diffInMinutes <= 5 && isPending) {
                newBadge = `<span class="badge bg-danger text-white badge-urgent ms-2 float-start">
                                <i class="fa-solid fa-triangle-exclamation fa-beat-fade me-1"></i> عاجل
                            </span>`;
                alertClass = "new-report-row";
            }
        }

        // 💡 إضافة شرط الإخفاء هنا: مش هنرسم الدبوس إلا لو البلاغ مش أرشيف، أو الزرار متفعل
        if (lat && lng && lat != 0) {
            if (!isResolved || showResolvedOnMap) {
                const iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${pinColor}.png`;
                const customIcon = L.icon({
                    iconUrl: iconUrl,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
                });

                const marker = L.marker([lat, lng], { icon: customIcon });
                marker.bindPopup(`
                    <div class="text-center fw-bold">
                        <h6 class="mb-1 text-primary">${type}</h6>
                        <div class="mb-2">${displayStateAr}</div>
                        <button class="btn btn-sm btn-dark w-100" onclick="openReportDetails(${id})">معاينة</button>
                    </div>
                `);
                markersLayer.addLayer(marker);
            }
        }

        // 💡 التعديل هنا: دمجنا كلاس السطر والبادج جوه הـ HTML
        const rowHtml = `
            <tr class="${alertClass}">
                <td class="fw-bold text-secondary">#${id}</td>
                <td class="fw-bold">${type} <br> ${newBadge}</td>
                <td>${formattedDate}</td>
                <td class="fw-bold">${displayStateAr}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm fw-bold" onclick="openReportDetails(${id})">
                        تفاصيل
                    </button>
                </td>
            </tr>
        `;

        if (isResolved) {
            archiveBody.innerHTML += rowHtml; 
        } else {
            activeBody.innerHTML += rowHtml; 
        }
    });

    document.getElementById('countTotal').textContent = cntTotal;
    document.getElementById('countPending').textContent = cntPending;
    document.getElementById('countInProgress').textContent = cntProg;
    document.getElementById('countResolved').textContent = cntRes;
}
// فتح التفاصيل في النافذة الجانبية
async function openReportDetails(id) {
    currentSelectedReportId = id;
    const panel = new bootstrap.Offcanvas(document.getElementById('reportDetailsPanel'));
    panel.show();

    // 1. تحديد العناصر
    const statusControl = document.getElementById('employee-only-status'); // حالة البلاغ
    const teamControl = document.getElementById('employee-only-team');     // الفريق
    const cancelBtn = document.getElementById('employee-only-cancel');     // الإلغاء / الحظر

   // 💡 التعديل: إظهار زر الرفض للجميع (أدمن وموظف)
    if (isAdmin) {
        if(statusControl) statusControl.style.display = 'none';
        if(teamControl) teamControl.style.display = 'none';
    } else {
        if(statusControl) statusControl.style.display = 'block';
        if(teamControl) teamControl.style.display = 'block';
    }
    // زرار الإلغاء والرفض بقى بيظهر دايماً لأي حد يفتح البلاغ
    if(cancelBtn) cancelBtn.style.display = 'block';

    document.getElementById('detailsContent').classList.add('d-none');
    document.getElementById('detailsSpinner').classList.remove('d-none');

    try {
        const res = await apiRequest(`Report/ReportDetails/${id}`, 'GET');
        if (res.ok) {
            let details = res.data;
            document.getElementById('reportDesc').textContent = details.description || details.Description || 'لا يوجد وصف متاح.';
            
            // 💡 1. جلب بيانات المُبلغ والمدينة والتاريخ والفريق
            const repName = details.reporterName || details.ReporterName || "مواطن (بدون اسم)";
            const repId = details.reporterId || details.ReporterId || "غير محدد";
            
            const cityId = details.cityId || details.CityId || 0;
            let cityName = `مدينة رقم (${cityId})`;
            if (cityId === 29) cityName = "سوهاج";
            if (cityId === 1) cityName = "القاهرة";
            cityName = details.cityName || details.CityName || cityName;

            const teamName = details.teamName || details.TeamName || "لم يتم التوجيه لأي فريق";
            
            let rawDate = details.date || details.Date || details.createdAt || details.CreatedAt;
            let formattedDateText = "غير معروف";
            if (rawDate) {
                let d = new Date(rawDate);
                formattedDateText = d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }

           // تحديث كارت المُبلغ بالتفاصيل الجديدة
            document.getElementById('reportUser').innerHTML = `
                <div class="d-flex flex-column gap-2">
                    <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-1">
                        <span class="fw-bold text-dark fs-5"><i class="fa-solid fa-user text-secondary me-2"></i>${repName}</span>
                        <span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1">User ID: #${repId}</span>
                    </div>
                    <div class="text-muted small fw-bold d-flex flex-column gap-2">
                        <div><i class="fa-solid fa-city text-danger me-1"></i> المدينة: <span class="badge bg-light text-dark border fs-6">${cityName}</span></div>
                        <div><i class="fa-regular fa-clock text-warning me-1"></i> التاريخ: <span class="text-dark" dir="ltr">${formattedDateText}</span></div>
                    </div>
                </div>
            `;

            // 💡 2. ملء بيانات التحليل الذكي (AI)
            const isValid = details.isValid !== undefined ? details.isValid : details.IsValid;
            const priority = details.priority || details.Priority;
            const confidence = details.confidenceScore || details.ConfidenceScore || 0;
            const recommendations = details.recommendations || details.Recommendations || "لم يصدر النظام توصيات محددة لهذه الحالة.";

            // المصداقية
            const isValidBadge = document.getElementById('aiIsValid');
            if (isValidBadge) {
                if (isValid === true) {
                    isValidBadge.className = "badge bg-success px-3 py-2";
                    isValidBadge.innerHTML = '<i class="fa-solid fa-check-circle me-1"></i> بلاغ حقيقي';
                } else if (isValid === false) {
                    isValidBadge.className = "badge bg-danger px-3 py-2";
                    isValidBadge.innerHTML = '<i class="fa-solid fa-times-circle me-1"></i> بلاغ كاذب / سبام';
                } else {
                    isValidBadge.className = "badge bg-secondary px-3 py-2";
                    isValidBadge.innerHTML = '<i class="fa-solid fa-circle-question me-1"></i> غير محدد';
                }
            }

            // الأولوية
            const priorityBadge = document.getElementById('aiPriority');
            if (priorityBadge) {
                let pStr = String(priority).toLowerCase();
                if (pStr === "high" || pStr === "عالي") {
                    priorityBadge.className = "badge bg-danger px-3 py-2";
                    priorityBadge.innerHTML = '<i class="fa-solid fa-fire me-1"></i> عالي الخطورة';
                } else if (pStr === "medium" || pStr === "متوسط") {
                    priorityBadge.className = "badge bg-warning text-dark px-3 py-2";
                    priorityBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i> متوسط';
                } else if (pStr === "low" || pStr === "منخفض") {
                    priorityBadge.className = "badge bg-info px-3 py-2";
                    priorityBadge.innerHTML = '<i class="fa-solid fa-arrow-down me-1"></i> منخفض';
                } else {
                    priorityBadge.className = "badge bg-secondary px-3 py-2";
                    priorityBadge.innerText = priority || "غير محدد";
                }
            }

            // نسبة الثقة
            const confText = document.getElementById('aiConfidenceText');
            const confBar = document.getElementById('aiConfidenceBar');
            if (confText && confBar) {
                let confPercentage = Math.round(confidence * 100); 
                if (confidence > 1) confPercentage = confidence; 
                
                confText.innerText = `${confPercentage}%`;
                confBar.style.width = `${confPercentage}%`;
                
                if (confPercentage >= 80) confBar.className = "progress-bar bg-success progress-bar-striped progress-bar-animated";
                else if (confPercentage >= 50) confBar.className = "progress-bar bg-warning progress-bar-striped progress-bar-animated";
                else confBar.className = "progress-bar bg-danger progress-bar-striped progress-bar-animated";
            }

            // التوصيات
            const recElement = document.getElementById('aiRecommendations');
            if (recElement) recElement.innerText = recommendations;

            // 💡 3. حل مشكلة الصورة وعرضها من المصفوفة
            const mediaItems = details.attachedMedia || details.AttachedMedia;
            let imgPath = null;

            if (mediaItems && mediaItems.length > 0) {
                mediaItems.forEach(item => {
                    let fileUrl = item.fileURL || item.FileURL;
                    let mediaType = item.mediaType || item.MediaType || "";
                    if (mediaType.toLowerCase() === 'image' && fileUrl) {
                        imgPath = fileUrl; // مسكنا الصورة
                    }
                });
            }

            if (imgPath) {
                if (!imgPath.startsWith('http')) {
                    imgPath = `https://abdallahnasrat-001-site1.anytempurl.com/${imgPath}`;
                }
                document.getElementById('reportImage').src = imgPath;
            } else {
                document.getElementById('reportImage').src = "https://cdn-icons-png.flaticon.com/512/854/854878.png";
            }

            // 💡 4. استخراج وعرض الصوت من المصفوفة
            const audioContainer = document.getElementById('reportAudioContainer');
            
            // رسالة افتراضية
            audioContainer.innerHTML = `
                <p class="text-muted small mb-0 fw-bold">
                    <i class="fa-solid fa-microphone-slash me-2 text-secondary"></i> لا يوجد تسجيل صوتي مرفق
                </p>
            `;

            if (mediaItems && mediaItems.length > 0) {
                mediaItems.forEach(item => {
                    let fileUrl = item.fileURL || item.FileURL;
                    let mediaType = item.mediaType || item.MediaType || "";

                    if (mediaType.toLowerCase() === 'audio' && fileUrl) {
                        if (!fileUrl.startsWith('http')) {
                            fileUrl = `https://abdallahnasrat-001-site1.anytempurl.com/${fileUrl}`;
                        }
                        audioContainer.innerHTML = `
                            <audio controls class="w-100" style="height: 40px; outline: none;">
                                <source src="${fileUrl}" type="audio/mpeg">
                                <source src="${fileUrl}" type="audio/mp4">
                                <source src="${fileUrl}" type="audio/x-m4a">
                                <source src="${fileUrl}" type="audio/wav">
                                متصفحك لا يدعم تشغيل الصوت.
                            </audio>
                        `;
                    }
                });
            }

            // 5. تحديد الحالة للقائمة المنسدلة
            if (!isAdmin) {
                const state = details.reportState !== undefined ? details.reportState : details.ReportState;
                const strCheck = String(state).toLowerCase().trim();
                let strState = "Pending";
                
                if (strCheck === "1" || strCheck === "inprogress") strState = "InProgress";
                if (strCheck === "2" || strCheck === "resolved") strState = "Resolved";
                if (strCheck === "3" || strCheck === "closed") strState = "Closed";

                if(document.getElementById('actionStatus')) {
                    document.getElementById('actionStatus').value = strState;
                }
            }
            
            document.getElementById('detailsSpinner').classList.add('d-none');
            document.getElementById('detailsContent').classList.remove('d-none');
        } else {
            showAlert('فشل جلب تفاصيل البلاغ', 'danger');
            panel.hide();
        }
    } catch(e) {
        console.error("Error loading report details:", e); 
        showAlert('خطأ في الاتصال', 'danger');
        panel.hide();
    }
}
// ------------------------------------------------------------------
// الأكشنز (تحديث البلاغ)
// ------------------------------------------------------------------

// 1. تغيير الحالة 
async function updateStatus() {
    const statusVal = document.getElementById('actionStatus').value; 
    
    let statusInt = 0; // Pending
    if (statusVal === "InProgress") statusInt = 1;
    if (statusVal === "Resolved") statusInt = 2;
    if (statusVal === "Closed") statusInt = 3; 

    try {
        // 💡 التعديل هنا: هنبعتها بكل الأسماء الممكنة عشان الـ DTO بتاعك يقبلها غصب عنه
        const payload = { 
            status: statusInt, 
            Status: statusInt,
            reportState: statusInt,
            ReportState: statusInt
        };
        console.log("جارِ إرسال تحديث الحالة للسيرفر:", payload);

        const res = await apiRequest(`Report/${currentSelectedReportId}/status`, 'PATCH', payload);
        
        if (res.ok) { 
            showAlert('تم تحديث الحالة بنجاح!', 'success'); 
            bootstrap.Offcanvas.getInstance(document.getElementById('reportDetailsPanel')).hide();
            checkRoleAndLoad(); // ريفريش الشاشة
        } else {
            showAlert('فشل التحديث! (تأكد أن حسابك لديه صلاحية Admin)', 'danger');
        }
    } catch(e) { showAlert('خطأ في الاتصال بالسيرفر', 'danger'); }
}

// 2. توجيه فريق ميداني
async function assignTeam() {
    const teamIdValue = document.getElementById('actionTeam').value;
    if (!teamIdValue) { showAlert('اختر فريق أولاً', 'warning'); return; }
    
    try {
        const payload = { teamId: parseInt(teamIdValue) };
        console.log("جارِ إرسال توجيه الفريق للسيرفر:", payload);

        const res = await apiRequest(`Report/${currentSelectedReportId}/Team`, 'PATCH', payload);
        
        if (res.ok) { 
            showAlert('تم توجيه الفريق بنجاح!', 'success');
            bootstrap.Offcanvas.getInstance(document.getElementById('reportDetailsPanel')).hide();
            checkRoleAndLoad();
        } else {
            showAlert('فشل التوجيه! (تأكد من صلاحياتك)', 'danger');
        }
    } catch(e) { showAlert('خطأ في الاتصال بالسيرفر', 'danger'); }
}

// 3. تغيير تصنيف البلاغ 
async function updateType() {
    const catIdValue = document.getElementById('actionCategory').value;
    if (!catIdValue) return;
    
    try {
        const payload = { categoryId: parseInt(catIdValue) };
        console.log("جارِ إرسال تغيير التصنيف للسيرفر:", payload);

        const res = await apiRequest(`Report/${currentSelectedReportId}/Type`, 'PATCH', payload);
        
        if (res.ok) { 
            showAlert('تم تغيير التصنيف بنجاح!', 'success'); 
            bootstrap.Offcanvas.getInstance(document.getElementById('reportDetailsPanel')).hide();
            checkRoleAndLoad();
        } else {
            showAlert('فشل التغيير! (تأكد من صلاحياتك)', 'danger');
        }
    } catch(e) { showAlert('خطأ في الاتصال بالسيرفر', 'danger'); }
}

// 4. إلغاء البلاغ نهائياً
// 4. إلغاء البلاغ نهائياً
async function cancelReport() {
    if(!confirm('هل أنت متأكد من إلغاء/رفض البلاغ نهائياً؟')) return;
    
    try {
        // 💡 التعديل السحري: بما إن الإلغاء هو "إغلاق"، هنبعت نفس الريكويست بتاع تغيير الحالة لـ Closed (3)
        const payload = { 
            status: 3, 
            Status: 3,
            reportState: 3,
            ReportState: 3
        };
        
        console.log("جارِ إرسال أمر الإغلاق/الإلغاء للسيرفر...");

        // استخدمنا مسار تغيير الحالة (PATCH) اللي شغال ومضمون 100% بدل مسار الـ cancel
        const res = await apiRequest(`Report/${currentSelectedReportId}/status`, 'PATCH', payload);
        
        if(res.ok) { 
            showAlert('تم إلغاء البلاغ وإغلاقه بنجاح!', 'success'); 
            bootstrap.Offcanvas.getInstance(document.getElementById('reportDetailsPanel')).hide();
            checkRoleAndLoad(); // ريفريش الجدول
        } 
        else {
            showAlert('فشل الإلغاء! (تأكد أن البلاغ ليس مغلقاً بالفعل)', 'danger');
        }
    } catch(e) { 
        showAlert('خطأ في الاتصال بالسيرفر', 'danger'); 
    }
}
// ------------------------------------------------------------------
// جلب القوائم المساعدة
// ------------------------------------------------------------------
async function loadLookups() {
    // جلب الفِرَق (زي ما هي مفيهاش تغيير)
    apiRequest('Teams', 'GET').then(res => {
        if(res.ok) {
            let teams = res.data.$values || res.data;
            let sel = document.getElementById('actionTeam');
            teams.forEach(t => {
                const id = t.id || t.Id;
                const name = t.name || t.Name;
                sel.innerHTML += `<option value="${id}">${name}</option>`;
            });
        }
    });

    // 💡 التعديل هنا: جلب التصنيفات وترجمتها للعربي
    apiRequest('Report/Categories', 'GET').then(res => {
        if(res.ok) {
            let cats = res.data.$values || res.data;
            let sel = document.getElementById('actionCategory');
            
            // 💡 قاموس الترجمة (تقدر تزود أو تعدل براحتك)
            const categoryTranslations = {
                "FIRE": "حريق",
                "INFRASTRUCTURE_DAMAGE": "تلف البنية التحتية",
                "WATER_DISASTER": "كارثة مائية / تسريب",
                "TRAFFIC_ACCIDENT": "حادث مروري",
                "CRIME_SCENE": "مسرح جريمة",
                "HARASSMENT": "حالة تحرش",
                "MEDICAL_EMERGENCY": "طوارئ طبية",
                "NORMAL": "بلاغ عادي",
                "Accident": "حادث عام",
                "Environmental": "بيئة ونظافة",
                "Health": "صحة عامة"
            };

            cats.forEach(c => {
                const id = c.id || c.Id || c.categoryId || c.CategoryId;
                const originalName = c.name || c.Name;
                
                // الجافاسكريبت هتدور في القاموس.. لو لقت الكلمة هتجيب العربي، لو ملقتهاش هتنزلها زي ما هي
                const arabicName = categoryTranslations[originalName] || originalName;

                sel.innerHTML += `<option value="${id}">${arabicName}</option>`;
            });
        }
    });
}

function openAnalyticsModal() {
    new bootstrap.Modal(document.getElementById('analyticsModal')).show();
}

function showAlert(msg, type) {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type} shadow-sm border-0 fw-bold alert-dismissible fade show">
            ${msg} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

//  دالة إظهار وإخفاء البلاغات المغلقة من على الخريطة
function toggleArchiveMarkers() {
    showResolvedOnMap = document.getElementById('toggleArchiveMap').checked;
    distributeReports(allLoadedReports); // إعادة رسم الخريطة بناءً على اختيار الزرار
}
