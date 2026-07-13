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

const menuToggle = document.getElementById('menuToggle');
const navContainer = document.getElementById('navContainer');
const toggleIcon = menuToggle.querySelector('i');

// Fungsi untuk buka-tutup menu saat tombol burger diklik
menuToggle.addEventListener('click', () => {
    navContainer.classList.toggle('active');
    
    // Mengubah ikon bars (garis tiga) menjadi ikon X saat terbuka
    if (navContainer.classList.contains('active')) {
        toggleIcon.classList.remove('fa-bars');
        toggleIcon.classList.add('fa-times');
    } else {
        toggleIcon.classList.remove('fa-times');
        toggleIcon.classList.add('fa-bars');
    }
});

// Otomatis menutup menu kembali ketika salah satu link diklik
const navLinks = navContainer.querySelectorAll('a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navContainer.classList.remove('active');
        toggleIcon.classList.remove('fa-times');
        toggleIcon.classList.add('fa-bars');
    });
});