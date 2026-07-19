// ==============================================================
// BACK-BUTTON.JS
// Menyuntikkan tombol "Kembali" mengambang di pojok kiri atas
// pada halaman-halaman yang diakses dengan berpindah dari
// halaman lain (Shop, Tracking, Panduan, Checkout, Payment,
// Terms, Privacy Policy, Refund Policy, dll).
//
// Sengaja dibuat "self-contained" (menyuntikkan style sendiri)
// supaya cukup ditambahkan lewat satu tag <script> tanpa perlu
// mengedit CSS di setiap halaman.
// ==============================================================

(function () {
    function init() {
        if (document.getElementById("backButton")) return;

        const style = document.createElement("style");
        style.textContent = `
.back-button{
    position:fixed;
    top:20px;
    left:20px;
    z-index:1050;
    width:44px;
    height:44px;
    border-radius:50%;
    border:1px solid rgba(255,255,255,.12);
    background:rgba(30,30,33,.75);
    backdrop-filter:blur(14px);
    -webkit-backdrop-filter:blur(14px);
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    box-shadow:0 10px 25px rgba(0,0,0,.35);
    transition:transform .3s cubic-bezier(.25,.8,.25,1), background .3s cubic-bezier(.25,.8,.25,1), color .3s cubic-bezier(.25,.8,.25,1);
}
.back-button:hover{
    background:#FFD166;
    color:#222;
    transform:translateY(-3px);
}
.back-button svg{
    width:19px;
    height:19px;
    stroke:currentColor;
    fill:none;
    stroke-width:2.4;
    stroke-linecap:round;
    stroke-linejoin:round;
}
@media (max-width:480px){
    .back-button{ top:14px; left:14px; width:38px; height:38px; }
    .back-button svg{ width:16px; height:16px; }
}
        `;
        document.head.appendChild(style);

        const btn = document.createElement("button");
        btn.id = "backButton";
        btn.className = "back-button";
        btn.type = "button";
        btn.setAttribute("aria-label", "Kembali ke halaman sebelumnya");
        btn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
            </svg>
        `;

        document.body.appendChild(btn);

        btn.addEventListener("click", () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = "index.html";
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
