AOS.init({

    duration:1000,

    once:true

});

// ==============================
// Tutorial Download
// ==============================

// Ganti link ini nanti dengan link Google Drive milikmu

const mobileTutorialLink =
"https://drive.google.com/file/d/ID_FILE_SMARTPHONE/view";

const pcTutorialLink =
"https://drive.google.com/file/d/ID_FILE_PC/view";

document
.getElementById("mobileTutorial")
.addEventListener("click",()=>{

    window.open(mobileTutorialLink,"_blank");

});

document
.getElementById("pcTutorial")
.addEventListener("click",()=>{

    window.open(pcTutorialLink,"_blank");

});

// ==============================
// FAQ ACCORDION
// ==============================

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {

    const button = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    const icon = item.querySelector("i");

    button.addEventListener("click", () => {

        faqItems.forEach(other => {

            if(other !== item){

                other.querySelector(".faq-answer").style.maxHeight = null;
                other.querySelector("i").classList.remove("fa-minus");
                other.querySelector("i").classList.add("fa-plus");

            }

        });

        if(answer.style.maxHeight){

            answer.style.maxHeight = null;

            icon.classList.remove("fa-minus");
            icon.classList.add("fa-plus");

        }else{

            answer.style.maxHeight = answer.scrollHeight + "px";

            icon.classList.remove("fa-plus");
            icon.classList.add("fa-minus");

        }

    });

});

// ==============================
// Back To Top
// ==============================

const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll",()=>{

    if(window.scrollY>500){

        backToTop.style.display="block";

    }else{

        backToTop.style.display="none";

    }

});

backToTop.addEventListener("click",()=>{

    window.scrollTo({

        top:0,

        behavior:"smooth"

    });

});