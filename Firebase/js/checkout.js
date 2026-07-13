import { sendTelegramNotification } from "./telegram.js";

import { db } from "../firebase/firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("checkoutForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    document.getElementById("loadingScreen").style.display = "flex";

    const firstName = document.querySelectorAll("input")[0].value;
    const lastName = document.querySelectorAll("input")[1].value;
    const email = document.querySelectorAll("input")[2].value;
    const phone = document.querySelectorAll("input")[3].value;

    const product = localStorage.getItem("productName");
    const price = Number(localStorage.getItem("productPrice"));
    // Membuat tanggal DDMMYYYY
const today = new Date();

const day = String(today.getDate()).padStart(2, "0");
const month = String(today.getMonth() + 1).padStart(2, "0");
const year = today.getFullYear();

const dateString = `${day}${month}${year}`;

    try {

        // Mengambil seluruh order
const snapshot = await getDocs(collection(db, "orders"));

// Menghitung jumlah order hari ini
let todayCount = 0;

snapshot.forEach(doc => {

    const data = doc.data();

    if (data.invoiceNumber &&
        data.invoiceNumber.includes(dateString)) {

        todayCount++;

    }

});

// Nomor urut 4 digit
const queueNumber =
String(todayCount + 1).padStart(4, "0");

// Invoice
const invoiceNumber =
`STR-${dateString}-${queueNumber}`;

    const docRef = await addDoc(collection(db, "orders"), {
        invoiceNumber,
        customerName: firstName + " " + lastName,
        email,
        phone,
        product,
        price,
        status: "waiting",
        downloadReady: false,
        downloadURL: "",
        createdAt: serverTimestamp()
    });

await sendTelegramNotification({
    title: "🛒 ORDER BARU",
    name: firstName + " " + lastName,
    email: email,
    product: product,
    total: "Rp " + price.toLocaleString("id-ID"),
    invoice: invoiceNumber
});

    localStorage.setItem("orderID", docRef.id);

    alert("Order berhasil disimpan");
window.location.href = "payment.html";

} catch (error) {

    console.error(error);

    alert(error.message);

}

});

