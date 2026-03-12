const APP_ID="83a6c971";
const APP_KEY="f57d9ecae7775582f830d07bfeecfbf4";
const LOGMEAL_TOKEN="937a44034a0fac902bd07ab4bceae7a13a233497";

let chart;
let currentUser="";
let cameraStream=null;

// FOOD LIST
const foodList=[
  {name:"Air Kelapa",normal:"1 cup coconut water"},
  {name:"Almond",normal:"30 g almonds"},
  {name:"Apel",normal:"100 g apple"},
  {name:"Brokoli",normal:"100 g broccoli"},
  {name:"Carrot",normal:"100 g carrot"},
  {name:"Cokelat Hitam",normal:"20 g dark chocolate"},
  {name:"Daging Ayam",normal:"100 g chicken"},
  {name:"Ikan Salmon",normal:"100 g salmon"},
  {name:"Telur Ayam",normal:"1 large egg"},
  {name:"Roti Gandum",normal:"1 slice whole wheat bread"},
  {name:"Tempe",normal:"100 g tempeh"},
  {name:"Yogurt",normal:"1 cup yogurt"}
];

// NAVIGATION
document.querySelectorAll(".navbar button").forEach(btn=>{
  btn.addEventListener("click",()=>showSection(btn.dataset.section));
});

function showSection(id){
  document.querySelectorAll(".section").forEach(sec=>sec.classList.add("hidden"));
  const target=document.getElementById(id);
  if(target) target.classList.remove("hidden");
  if(id==="riwayat") loadHistory();
}

// USER ACCOUNT
document.getElementById("saveUserBtn").addEventListener("click",saveUser);
function saveUser(){
  const username=document.getElementById("username").value.trim();
  if(username){ 
    currentUser=username;
    localStorage.setItem("user",currentUser);
    document.getElementById("welcome").innerText="Halo "+currentUser;
  } else {
    document.getElementById("welcome").innerText="Halo, selamat datang!";
  }
}

// RENDER FOOD LIST
function renderFoodList(list){
  const container=document.getElementById("foodListContainer");
  container.innerHTML="";
  list.forEach(f=>{
    const div=document.createElement("div");
    div.className="food-card";
    div.innerText=f.name+" - "+f.normal;
    div.onclick=()=>{document.getElementById("foodInput").value=f.normal;};
    container.appendChild(div);
  });
}
document.getElementById("searchFood").addEventListener("input",()=>{
  const query=document.getElementById("searchFood").value.toLowerCase();
  renderFoodList(foodList.filter(f=>f.name.toLowerCase().includes(query)));
});
renderFoodList(foodList);

// CHECK FOOD WITH EDAMAM
document.getElementById("cekFoodBtn").addEventListener("click",cekFood);
async function cekFood(){
  const input=document.getElementById("foodInput").value.trim();
  if(!input){ alert("Masukkan makanan contoh: 100 g apel"); return; }
  const result=document.getElementById("result");
  result.innerHTML="Loading...";
  try{
    const res=await fetch(`https://api.edamam.com/api/nutrition-data?app_id=${APP_ID}&app_key=${APP_KEY}&ingr=${encodeURIComponent(input)}`);
    const data=await res.json();
    if(!data.ingredients?.[0]?.parsed?.[0]){ result.innerHTML="Data tidak ditemukan"; return; }
    const n=data.ingredients[0].parsed[0].nutrients;
    const stats={cal:n.ENERC_KCAL?.quantity||0,fat:n.FAT?.quantity||0,protein:n.PROCNT?.quantity||0,carbs:n.CHOCDF?.quantity||0,fiber:n.FIBTG?.quantity||0,sugar:n.SUGAR?.quantity||0,sodium:n.NA?.quantity||0,cholesterol:n.CHOLE?.quantity||0};
    let score=100;if(stats.fat>15) score-=20;if(stats.sugar>15) score-=20;if(stats.sodium>500) score-=20;if(stats.cal>300) score-=10;if(score<0) score=0;
    let cls="good";if(score<50) cls="bad";else if(score<75) cls="warning";
    result.innerHTML=`
      <div class="card">
      <div class="nutrition-grid">
      <div>Kalori: ${stats.cal.toFixed(1)} kcal</div>
      <div>Lemak: ${stats.fat.toFixed(1)} g</div>
      <div>Protein: ${stats.protein.toFixed(1)} g</div>
      <div>Karbohidrat: ${stats.carbs.toFixed(1)} g</div>
      <div>Serat: ${stats.fiber.toFixed(1)} g</div>
      <div>Gula: ${stats.sugar.toFixed(1)} g</div>
      <div>Sodium: ${stats.sodium.toFixed(1)} mg</div>
      <div>Kolesterol: ${stats.cholesterol.toFixed(1)} mg</div>
      </div>
      <div class="progress">
      <div class="progress-bar ${cls}" style="width:${score}%">Skor GERD ${score}/100</div>
      </div>
      </div>`;
    saveHistory(input,score);
    const canvas=document.getElementById("nutritionChart");
    if(canvas){if(chart) chart.destroy();chart=new Chart(canvas,{type:"bar",data:{labels:["Kalori","Lemak","Protein","Karbo"],datasets:[{data:[stats.cal,stats.fat,stats.protein,stats.carbs]}]}});}
  }catch(e){result.innerHTML="Error: "+e.message;}
}

// HISTORY
function saveHistory(food,score){
  if(!currentUser) return;
  let allHist=JSON.parse(localStorage.getItem("history"))||{};
  if(!allHist[currentUser]) allHist[currentUser]=[];
  allHist[currentUser].push({food,score});
  localStorage.setItem("history",JSON.stringify(allHist));
}
function loadHistory(){
  const historyList=document.getElementById("historyList");
  historyList.innerHTML="";
  if(!currentUser){historyList.innerHTML="<p>Gunakan akun untuk menyimpan riwayat</p>"; return;}
  let h=JSON.parse(localStorage.getItem("history"))?.[currentUser]||[];
  if(h.length===0){historyList.innerHTML="<p>Belum ada riwayat</p>"; return;}
  h.forEach(i=>{historyList.innerHTML+=`<div class="card">${i.food} - Skor ${i.score}</div>`;});
}

// BMI
document.getElementById("bmiBtn").addEventListener("click",()=>{
  const w=parseFloat(document.getElementById("weight").value);
  const h=parseFloat(document.getElementById("height").value)/100;
  if(!w||!h) return;
  const bmi=w/(h*h);
  let ket=bmi<18.5?"Kurus":bmi<25?"Normal":bmi<30?"Overweight":"Obesitas";
  document.getElementById("bmiResult").innerHTML=`<div class="card">IMT: ${bmi.toFixed(1)} (${ket})</div>`;
});

// CAMERA & LOGMEAL
document.getElementById("openCameraBtn").addEventListener("click",async ()=>{
  const video=document.getElementById("camera");
  video.classList.remove("hidden");
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
    video.srcObject=cameraStream;
    await video.play();
  }catch(e){alert("Kamera tidak bisa diakses: "+e.message);}
});

document.getElementById("takePhotoBtn").addEventListener("click",async ()=>{
  const video=document.getElementById("camera");
  const img=document.getElementById("capturedImage");
  if(!video.videoWidth){alert("Video belum siap");return;}
  const canvas=document.createElement("canvas");
  canvas.width=video.videoWidth; canvas.height=video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);
  const dataURL=canvas.toDataURL("image/jpeg");
  img.src=dataURL; img.classList.remove("hidden");
  document.getElementById("foodInput").value="Mendeteksi makanan...";

  // Panggil LogMeal
  try{
    const formData=new FormData();
    formData.append("image",await (await fetch(dataURL)).blob());
    const res=await fetch("https://api.logmeal.es/v2/recognition/complete",{
      method:"POST",
      headers:{Authorization:"Bearer "+LOGMEAL_TOKEN},
      body:formData
    });
    const data=await res.json();
    const detected=data.recognition_results?.[0]?.name || "Tidak dikenal";
    document.getElementById("foodInput").value=detected;
  }catch(e){document.getElementById("foodInput").value="Gagal mendeteksi";}
});

// LOAD USER
window.addEventListener("DOMContentLoaded",()=>{
  currentUser=localStorage.getItem("user")||"";
  if(currentUser) document.getElementById("welcome").innerText="Halo kembali "+currentUser;
});
