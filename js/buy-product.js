// ==============================================================
// BUY-PRODUCT.JS
// Fungsi bersama untuk tombol "Buy Now" di kartu produk manapun
// (Featured Collections di index.html maupun halaman Shop).
// ==============================================================

function buyProduct(name, price, id = "") {
    localStorage.setItem("productName", name);
    localStorage.setItem("productPrice", price);
    localStorage.setItem("productId", id);

    window.location.href = "terms.html";
}

window.buyProduct = buyProduct;
