function openPBI() {
    const embedUrl = "https://app.powerbi.com/reportEmbed?reportId=YOUR_REPORT_ID&autoAuth=true";

    const container = document.getElementById('pbiContainer');
    if (!container) {
        console.error("خطأ: عنصر pbiContainer مش موجود في الصفحة!");
        return;
    }

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

    const modalElement = document.getElementById('pbiModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        alert("خطأ: مودال pbiModal مش موجود في ملف الـ HTML!");
    }
}
