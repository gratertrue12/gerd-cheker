// === API KEYS ===
const EDAMAM_APP_ID = 'YOUR_EDAMAM_APP_ID';
const EDAMAM_APP_KEY = 'YOUR_EDAMAM_APP_KEY';
const LOGMEAL_API_KEY = 'YOUR_LOGMEAL_API_KEY';

let chart, classifier;
let currentUser = "";

// Food list
const foodList = [
  { name: "Air Kelapa", normal: "1 cup coconut water" },
  { name: "Apel", normal: "100 g apple" },
  { name: "Teh", normal: "1 cup tea" },
  { name: "Cokelat Hitam", normal: "20 g dark chocolate" }
];

// Mapping for ambiguous labels
const mapping = { "iced tea": "tea", "espresso": "coffee", "bottle": "tea" };

// Initialize
window.addEventListener("DOMContentLoaded", async () => {
  currentUser = localStorage.getItem("user") || "";
  if(currentUser) document.getElementById("welcome").innerText = "Halo kembali " + currentUser;
  foodList.sort((a,b)=>a.name.localeCompare(b.name));
  renderFoodList(foodList);

  try { classifier = await ml5.imageClassifier('MobileNet'); console.log("MobileNet siap"); }
  catch(err){ alert("Gagal memuat AI"); console.error(err); }
});

// Section toggle
function showSection(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.add("hidden"));
  const sec = document.getElementById(id);
  if(sec) sec.classList.remove("hidden");
  if(id==="riwayat") loadHistory();
}

// Save username
function saveUser(){
  const name = document.getElementById("username").value.trim();
  currentUser = name;
  document.getElementById("welcome").innerText = currentUser? "Halo "+currentUser : "Halo, silakan cek makanan";
  if(currentUser) localStorage.setItem("user", currentUser);
  loadHistory();
}

// Render food list
function renderFoodList(list){
  const container = document.getElementById("foodListContainer");
  container.innerHTML = "";
  list.forEach(f=>{
    const div = document.createElement("div");
    div.className="food-card";
    div.innerText = `${f.name} - ${f.normal}`;
    div.onclick=()=>document.getElementById("foodInput").value=f.normal;
    container.appendChild(div);
  });
}

// Search filter
function searchFood(){
  const query = document.getElementById("searchFood").value.toLowerCase();
  renderFoodList(foodList.filter(f=>f.name.toLowerCase().includes(query)));
}

// Check food via Edamam
async function cekFood(){
  const query = document.getElementById("foodInput").value.trim();
  const resultDiv = document.getElementById("result");
  if(!query){ alert("Masukkan makanan"); return; }

  const cache = JSON.parse(localStorage.getItem("cache")||"{}");
  if(cache[query]){ displayNutritionResult(cache[query],resultDiv); return; }

  resultDiv.innerHTML="<p>Loading...</p>";
  const url=`https://api.edamam.com/api/nutrition-data?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(query)}`;
  try{
    const res = await fetch(url);
    const data = await res.json();
    if(!data.ingredients||!data.ingredients[0].parsed){ resultDiv.innerHTML="<p>Data tidak ditemukan.</p>"; return; }
    const n=data.ingredients[0].parsed[0].nutrients;
    const stats={
      cal:n.ENERC_KCAL?.quantity||0, fat:n.FAT?.quantity||0, protein:n.PROCNT?.quantity||0,
      carbs:n.CHOCDF?.quantity||0, fiber:n.FIBTG?.quantity||0, sugar:n.SUGAR?.quantity||0,
      sodium:n.NA?.quantity||0, cholesterol:n.CHOLE?.quantity||0
    };
    cache[query]=stats;
    localStorage.setItem("cache", JSON.stringify(cache));
    displayNutritionResult(stats,resultDiv);
    drawChart(stats);
    saveHistory(query,computeScore(stats));
  }catch(err){ resultDiv.innerHTML=`<p>Error: ${err.message}</p>`; }
}

// Display result
function displayNutritionResult(stats,resultDiv){
  const score=computeScore(stats);
  let cls=score<50?"bad":score<75?"warning":"good";
  resultDiv.innerHTML=`
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
}

// Compute GERD score
function computeScore(stats){
  let score=100;
  if(stats.fat>15) score-=20;
  if(stats.sugar>15) score-=20;
  if(stats.sodium>500) score-=20;
  if(stats.cal>300) score-=10;
  return Math.max(score,0);
}

// Chart
function drawChart(stats){
  const canvas=document.getElementById("nutritionChart");
  if(!canvas) return;
  if(chart) chart.destroy();
  chart=new Chart(canvas,{type:'bar', data:{labels:['Kalori','Lemak','Protein','Karbo'], datasets:[{data:[stats.cal,stats.fat,stats.protein,stats.carbs]}]}});
}

// Camera
async function openCamera(){
  const video=document.getElementById("camera");
  video.classList.remove("hidden");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
    video.srcObject=stream;
    await video.play();
  }catch(e){ alert("Kamera tidak dapat diakses: "+e.message); }
}

// Take photo and detect food
async function takePhoto(){
  const video=document.getElementById("camera");
  const img=document.getElementById("capturedImage");
  const input=document.getElementById("foodInput");
  if(!video||!classifier){ alert("Video/AI belum siap!"); return; }
  const canvas=document.createElement("canvas");
  canvas.width=video.videoWidth; canvas.height=video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0);
  const dataURL=canvas.toDataURL("image/png");
  img.src=dataURL; img.classList.remove("hidden");
  input.value="Mendeteksi makanan...";

  canvas.toBlob(async blob=>{
    try{
      const formData=new FormData(); formData.append('image',blob);
      const res=await fetch('https://api.logmeal.com/v2/image/segmentation/complete',{
        method:'POST', headers:{'Authorization':'Bearer '+LOGMEAL_API_KEY}, body:formData
      });
      if(res.status===429){ alert("Quota LogMeal habis."); return; }
      if(!res.ok) throw new Error(res.statusText);
      const data=await res.json();
      if(data.dishes && data.dishes.length>0){ input.value=data.dishes[0].name; return; }
    }catch(err){ console.warn("LogMeal gagal, fallback MobileNet", err); }

    classifier.classify(img,(err,results)=>{
      if(err){ console.error(err); input.value="Gagal mengenali makanan"; return; }
      let label=results[0].label.toLowerCase();
      for(const key in mapping) if(label.includes(key)){ label=mapping[key]; break; }
      const match=foodList.find(f=>label.includes(f.name.toLowerCase()));
      input.value=match?match.normal:label;
    });
  },'image/png');
}

// History
function saveHistory(food,score){
  const allHist=JSON.parse(localStorage.getItem("history")||"{}");
  if(!allHist[currentUser]) allHist[currentUser]=[];
  allHist[currentUser].push({food,score});
  localStorage.setItem("history",JSON.stringify(allHist));
}
function loadHistory(){
  const historyList=document.getElementById("historyList");
  historyList.innerHTML="";
  if(!currentUser){ historyList.innerHTML="<p>Masukkan nama akun untuk melihat riwayat.</p>"; return; }
  const h=(JSON.parse(localStorage.getItem("history")||"{}"))[currentUser]||[];
  if(h.length===0){ historyList.innerHTML="<p>Belum ada riwayat.</p>"; return; }
  h.forEach(item=>{ const div=document.createElement("div"); div.className="card"; div.textContent=`${item.food} - Skor ${item.score}`; historyList.appendChild(div); });
}

// BMI
function hitungBMI(){
  const w=parseFloat(document.getElementById("weight").value);
  const h=parseFloat(document.getElementById("height").value)/100;
  if(!w||!h) return;
  const bmi=w/(h*h);
  let category="";
  if(bmi<18.5) category="Kurus"; else if(bmi<25) category="Normal";
  else if(bmi<30) category="Overweight"; else category="Obesitas";
  document.getElementById("bmiResult").innerHTML=`<div class="card">IMT: ${bmi.toFixed(1)} (${category})</div>`;
}
