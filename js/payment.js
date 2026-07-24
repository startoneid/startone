import { db } from "./firebase.js";
import { sendTelegramNotification } from "./telegram.js";

import {
doc,
onSnapshot,
updateDoc,
serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const orderID = localStorage.getItem("orderID");
const proofInput = document.getElementById("paymentProof");
const previewImage = document.getElementById("previewImage");

if (!orderID) {

alert("Order tidak ditemukan");

window.location.href = "checkout.html";

throw new Error("Order kosong");

}

const orderRef = doc(db, "orders", orderID);

const statusText = document.getElementById("paymentStatus");
const downloadBtn = document.getElementById("downloadBtn");
const paidBtn = document.getElementById("paidBtn");

// Menyimpan data order terbaru (dari onSnapshot) supaya bisa dipakai
// untuk mengisi notifikasi Telegram saat pembeli menekan "Saya Sudah Bayar".
let currentOrderData = null;

window.iHavePaid = async () => {

    const file = proofInput.files[0];

    if (!file) {

        alert("Silakan upload bukti pembayaran terlebih dahulu.");

        return;

    }

    try {

        paidBtn.disabled = true;

        paidBtn.innerHTML = "Mengupload Bukti...";

        const formData = new FormData();

        formData.append("file", file);

        formData.append("upload_preset", "payment-proof");

        const response = await fetch(
            "https://api.cloudinary.com/v1_1/giwqhlt9/image/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();

        if (!result.secure_url) {

            throw new Error("Upload gagal");

        }

        await updateDoc(orderRef, {

            status: "waiting_verification",

            paymentTime: serverTimestamp(),

            paymentProof: result.secure_url

        });

        // Kirim notifikasi Telegram ke admin begitu pembeli menekan
        // "Saya Sudah Bayar" dan bukti pembayaran berhasil diupload.
        sendTelegramNotification({
            title: "💰 KONFIRMASI PEMBAYARAN",
            name: currentOrderData?.customerName || "-",
            email: currentOrderData?.email || "-",
            product: currentOrderData?.product || "-",
            total: "Rp " + Number(currentOrderData?.price || 0).toLocaleString("id-ID"),
            invoice: currentOrderData?.invoiceNumber || orderID,
            proof: result.secure_url
        });

        alert("Bukti pembayaran berhasil dikirim!");

    } catch (err) {

        console.error(err);

        alert("Upload gagal.");

        paidBtn.disabled = false;

        paidBtn.innerHTML = "Saya Sudah Bayar";

    }

};

onSnapshot(orderRef,(snapshot)=>{

const data = snapshot.data();

if(!data) return;

currentOrderData = data;

document.getElementById("invoiceNumber").textContent =
data.invoiceNumber || "-";

switch(data.status){

case "waiting":

statusText.innerHTML="🟡 Menunggu Pembayaran";

break;

case "waiting_verification":

statusText.innerHTML="🟠 Menunggu Verifikasi";

paidBtn.disabled=true;

paidBtn.innerHTML="Menunggu Verifikasi";

break;

case "verified":

statusText.innerHTML="🟢 Pembayaran Berhasil";

paidBtn.style.display="none";

downloadBtn.style.display="block";

downloadBtn.href=data.downloadURL;

break;

case "rejected":

statusText.innerHTML="🔴 Pembayaran Ditolak";

paidBtn.disabled=false;

paidBtn.innerHTML="Saya Sudah Bayar";

break;

}



});

proofInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        previewImage.src = e.target.result;

        previewImage.style.display = "block";

    };

    reader.readAsDataURL(file);

});

window.copyInvoice = async () => {

    const invoice =
    document.getElementById("invoiceNumber").textContent;

    try{

        await navigator.clipboard.writeText(invoice);

        alert("Invoice berhasil disalin.");

    }catch(error){

        console.error(error);

        alert("Gagal menyalin invoice.");

    }

};

