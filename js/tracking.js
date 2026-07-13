import { db } from "../Firebase/firebase.js";

import {

collection,
query,
where,
getDocs

}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btn=document.getElementById("checkBtn");

btn.onclick=async()=>{

const invoice=
document.getElementById("invoice").value.trim();

const email=
document.getElementById("email").value.trim();

const result=
document.getElementById("result");

result.innerHTML="Mencari...";

const q=query(

collection(db,"orders"),

where("invoiceNumber","==",invoice),

where("email","==",email)

);

const snap=await getDocs(q);

if(snap.empty){

result.innerHTML="Order tidak ditemukan.";

return;

}

const data=snap.docs[0].data();

let statusIcon="🟡";

if(data.status==="verified") statusIcon="🟢";

if(data.status==="rejected") statusIcon="🔴";

let download="";

if(data.status==="verified"){

download=`

<br><br>

<a
href="${data.downloadURL}"
download>

Download Produk

</a>

`;

}

result.innerHTML=`

<div class="card">

<h2>${data.invoiceNumber}</h2>

<p><b>Nama :</b> ${data.customerName}</p>

<p><b>Produk :</b> ${data.product}</p>

<p><b>Status :</b> ${statusIcon} ${data.status}</p>

<div class="progress">

<div class="step">

${data.status==="waiting"?"🟡":"🟢"}

Checkout

</div>

<div class="step">

${data.status==="waiting_verification"||data.status==="verified"?"🟢":"⚪"}

Pembayaran

</div>

<div class="step">

${data.status==="verified"?"🟢":"🟠"}

Verifikasi

</div>

<div class="step">

${data.status==="verified"?"🟢":"⚪"}

Download

</div>

</div>

${download}

</div>

`;

};