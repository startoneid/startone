// ==============================================================
// TOAST.JS
// Utilitas notifikasi kecil (toast) yang dipakai bersama oleh
// index.html, shop.html, dan halaman lain yang memuat produk.
// ==============================================================

function showToast(message, icon = "fa-solid fa-circle-check") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3300);
}

window.showToast = showToast;
