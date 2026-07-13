async function loadFooter() {

    const response = await fetch("components/footer.html");

    const html = await response.text();

    document
        .getElementById("footer-placeholder")
        .innerHTML = html;

    initBackToTop();

}

function initBackToTop() {

    const backToTop = document.getElementById("backToTop");

    if (!backToTop) return;

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

}

loadFooter();