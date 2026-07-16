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
// MENAMPILKAN PRODUK REALTIME DARI FIREBASE
// ==========================================
import { db } from "./firebase.js"; // Sesuaikan path jika file firebase.js ada di folder yang sama
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productContainer = document.getElementById("productContainer");

// Mendengarkan perubahan data di koleksi "products" secara realtime
onSnapshot(collection(db, "products"), (snapshot) => {
    // Kosongkan wadah terlebih dahulu agar tidak duplikat saat ada pembaruan
    productContainer.innerHTML = ""; 

    if (snapshot.empty) {
        productContainer.innerHTML = `<p style="text-align:center; width:100%; color:#aaa;">Belum ada produk tersedia.</p>`;
        return;
    }

    snapshot.forEach((doc) => {
        const product = doc.data();

        // Membuat template kartu produk
        const productCard = `
            <div class="shop-card">
                <img src="${product.image || 'images/default-preset.jpg'}" alt="${product.name}" class="shop-img" loading="lazy">
                <div class="shop-info">
                    <h3>${product.name}</h3>
                    <p class="price">Rp ${Number(product.price).toLocaleString('id-ID')}</p>
                    <button class="btn btn-shop" onclick="buyProduct('${product.name}', ${product.price})">
                        Buy Now
                    </button>
                </div>
            </div>
        `;

        // Masukkan kartu ke dalam wadah HTML
        productContainer.innerHTML += productCard;
    });
});