// ==============================================================
// CARD-TILT.JS
// Efek tilt 3D ringan yang mengikuti posisi kursor pada kartu
// produk (.card). Dipakai bersama oleh Featured Collections
// (index.html) dan halaman Shop (shop.html) supaya kartu produk
// di kedua halaman punya fitur yang identik.
// Hanya aktif di layar yang punya mouse (bukan sentuh) & tidak
// dalam mode "reduced motion".
// ==============================================================

const prefersReducedMotionTilt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsHoverTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (supportsHoverTilt && !prefersReducedMotionTilt) {

    document.addEventListener("mousemove", (e) => {
        const card = e.target.closest(".card");
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateY = ((x - centerX) / centerX) * 6;
        const rotateX = ((centerY - y) / centerY) * 6;

        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });

    document.addEventListener("mouseleave", (e) => {
        const card = e.target.closest?.(".card");
        if (card) card.style.transform = "";
    }, true);
}
