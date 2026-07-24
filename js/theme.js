// ==============================================================
// THEME.JS
// Mengatur mode tampilan (Gelap/Terang) untuk website StarTone.
// Preferensi disimpan di localStorage supaya konsisten di semua
// halaman yang memuat script ini. Mode Gelap adalah default.
// ==============================================================

const THEME_KEY = "startone_theme";
const DEFAULT_THEME = "dark";

function getSiteTheme() {
    try {
        return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
}

function setSiteTheme(theme) {
    const safeTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", safeTheme);

    try {
        localStorage.setItem(THEME_KEY, safeTheme);
    } catch {
        // localStorage tidak tersedia (mode privat, dsb) - tetap terapkan
        // temanya untuk sesi saat ini walau tidak tersimpan permanen.
    }
}

// Terapkan tema tersimpan sesegera mungkin supaya halaman tidak
// "berkedip" dari mode Gelap ke mode Terang saat baru dimuat.
setSiteTheme(getSiteTheme());

window.getSiteTheme = getSiteTheme;
window.setSiteTheme = setSiteTheme;
