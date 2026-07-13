// ==============================
// AOS Animation
// ==============================

AOS.init({
    duration: 1000,
    once: true,
});

// ==============================
// Smooth Scroll Shop Now
// ==============================

const shopNowBtn = document.getElementById("shopNowBtn");

if (shopNowBtn) {

    shopNowBtn.addEventListener("click", function(e){

        e.preventDefault();

        document.getElementById("shop").scrollIntoView({

            behavior: "smooth",
            block: "start"

        });

    });

}

// ==============================
// Buy Product
// ==============================

function buyProduct(name, price) {

    localStorage.setItem("productName", name);
    localStorage.setItem("productPrice", price);

    window.location.href = "terms.html";

}

// ==============================
// Back To Top
// ==============================

const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {

    if (window.scrollY > 500) {

        backToTop.style.display = "block";

    } else {

        backToTop.style.display = "none";

    }

});

backToTop.addEventListener("click", () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

});

// ==========================================
// BURGER MENU RESPONSIF (DIPERBAIKI)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById('menuToggle');
    const navContainer = document.getElementById('navContainer');
    
    // Pastikan menuToggle ditemukan dulu sebelum mencari icon di dalamnya
    if (menuToggle && navContainer) {
        const toggleIcon = menuToggle.querySelector('i');

        // Fungsi untuk buka-tutup menu saat tombol burger diklik
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navContainer.classList.toggle('active');
            
            if (toggleIcon) {
                if (navContainer.classList.contains('active')) {
                    toggleIcon.classList.remove('fa-bars');
                    toggleIcon.classList.add('fa-times');
                } else {
                    toggleIcon.classList.remove('fa-times');
                    toggleIcon.classList.add('fa-bars');
                }
            }
        });

        // Otomatis menutup menu kembali ketika salah satu link diklik
        const navLinks = navContainer.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navContainer.classList.remove('active');
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-times');
                    toggleIcon.classList.add('fa-bars');
                }
            });
        });

        // Menutup menu jika pengguna mengklik di luar area menu dropdown
        document.addEventListener('click', (e) => {
            if (!navContainer.contains(e.target) && !menuToggle.contains(e.target)) {
                navContainer.classList.remove('active');
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-times');
                    toggleIcon.classList.add('fa-bars');
                }
            }
        });
    }
});