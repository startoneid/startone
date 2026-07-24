// ==============================================================
// SETTINGS-PAGE.JS
// Logika halaman Pengaturan (settings.html): menandai mode
// tampilan yang sedang aktif dan menerapkan pilihan baru saat
// pengguna mengklik salah satu opsi (Gelap / Terang).
// ==============================================================

const themeOptionButtons = document.querySelectorAll(".theme-option");

function markActiveThemeOption() {
    const currentTheme = window.getSiteTheme?.() || "dark";

    themeOptionButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.themeOption === currentTheme);
    });
}

themeOptionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const theme = btn.dataset.themeOption;
        window.setSiteTheme?.(theme);
        markActiveThemeOption();

        window.showToast?.(
            theme === "light" ? "Mode Terang diaktifkan" : "Mode Gelap diaktifkan",
            theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon"
        );
    });
});

markActiveThemeOption();
