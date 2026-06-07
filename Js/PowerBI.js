function openPBI() {
    // 1. تأكد إن الرابط متغيره لـ الرابط الفعلي بتاعك
    const embedUrl = "https://app.powerbi.com/reportEmbed?reportId=YOUR_REPORT_ID&autoAuth=true";

    // 2. التأكد إن العنصر موجود في الصفحة قبل ما نبدأ
    const container = document.getElementById('pbiContainer');
    if (!container) {
        console.error("خطأ: عنصر pbiContainer مش موجود في الصفحة!");
        return;
    }

    // 3. بناء الـ Iframe مع إضافة loading بسيط
    container.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height: 100%;">
            <div class="spinner-border text-primary" role="status"></div>
        </div>
        <iframe 
            src="${embedUrl}" 
            width="100%" 
            height="100%" 
            frameborder="0" 
            allowFullScreen="true"
            onload="this.previousElementSibling.style.display='none'"> 
        </iframe>
    `;

    // 4. فتح المودال (مع التأكد إن Bootstrap موجود)
    const modalElement = document.getElementById('pbiModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        alert("خطأ: مودال pbiModal مش موجود في ملف الـ HTML!");
    }
}