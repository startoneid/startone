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
