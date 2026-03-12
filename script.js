onst APP_ID="fa8057e3";
const APP_KEY="010b6c60ab741559675bae7899ad6af1";

let chart;
let classifier; 
let currentUser="";

// ================= MENU =================
function showSection(id){
  document.querySelectorAll(".section").forEach(sec=>sec.classList.add("hidden"));
  const target=document.getElementById(id);
  if(target) target.classList.remove("hidden");
  if(id==="riwayat") loadHistory();
}

// ================= FOOD LIST =================
const foodList=[
{name:"Air Kelapa",normal:"1 cup coconut water"},
{name:"Almond",normal:"30 g almonds"},
{name:"Anggur",normal:"100 g grapes"},
{name:"Apel",normal:"100 g apple"},
{name:"Brokoli",normal:"100 g broccoli"},
{name:"Buncis",normal:"100 g green beans"},
{name:"Carrot",normal:"100 g carrot"},
{name:"Cokelat Hitam",normal:"20 g dark chocolate"},
{name:"Cornflakes",normal:"1 cup cornflakes"},
{name:"Daging Ayam",normal:"100 g chicken"},
{name:"Daging Sapi",normal:"100 g beef"},
{name:"Ikan Salmon",normal:"100 g salmon"},
{name:"Ikan Tuna",normal:"100 g tuna"},
{name:"Jagung",normal:"100 g corn"},
{name:"Kentang",normal:"100 g potato"},
{name:"Kiwi",normal:"100 g kiwi"},
{name:"Mangga",normal:"100 g mango"},
{name:"Melon",normal:"100 g cantaloupe"},
{name:"Nanas",normal:"100 g pineapple"},
{name:"Oatmeal",normal:"1 cup oatmeal"},
{name:"Orange",normal:"100 g orange"},
{name:"Papaya",normal:"100 g papaya"},
{name:"Peanut Butter",normal:"20 g peanut butter"},
{name:"Roti Gandum",normal:"1 slice whole wheat bread"},
{name:"Semangka",normal:"100 g watermelon"},
{name:"Strawberry",normal:"100 g strawberry"},
{name:"Tempe",normal:"100 g tempeh"},
{name:"Telur Ayam",normal:"1 large egg"},
{name:"Tofu",normal:"100 g tofu"},
{name:"Tomat",normal:"100 g tomato"},
{name:"Yogurt",normal:"1 cup yogurt"}
];

// ================= RENDER LIST =================
function renderFoodList(list){
  const container=document.getElementById("foodListContainer");
  if(!container) return;
  container.innerHTML="";
  list.forEach(f=>{
    const div=document.createElement("div");
    div.className="food-card";
    div.innerText=f.name+" - "+f.normal;
    div.onclick=()=>{
      const input=document.getElementById("foodInput");
      if(input) input.value=f.normal;
    };
    container.appendChild(div);
  });
}

// ================= SEARCH =================
function searchFood(){
  const search=document.getElementById("searchFood");
  if(!search) return;
  const query=search.value.toLowerCase();
  const filtered=foodList.filter(f=>f.name.toLowerCase().includes(query));
  renderFoodList(filtered);
}

// ================= GERD CHECKER =================
async function cekFood(){
  const inputEl=document.getElementById("foodInput");
  if(!inputEl) return;
  const input=inputEl.value.trim();
  if(!input){ alert("Masukkan makanan contoh: 100 g apple"); return; }
  const result=document.getElementById("result");
  const url=`https://api.edamam.com/api/nutrition-data?app_id=${APP_ID}&app_key=${APP_KEY}&ingr=${encodeURIComponent(input)}`;
  try{
    const res=await fetch(url);
    const data=await res.json();
    if(!data.ingredients?.[0]?.parsed?.[0]){
      if(result) result.innerHTML="Data tidak ditemukan"; return;
    }
    const n=data.ingredients[0].parsed[0].nutrients;
    const stats={
      cal:n.ENERC_KCAL?.quantity||0,
      fat:n.FAT?.quantity||0,
      protein:n.PROCNT?.quantity||0,
      carbs:n.CHOCDF?.quantity||0,
      fiber:n.FIBTG?.quantity||0,
      sugar:n.SUGAR?.quantity||0,
      sodium:n.NA?.quantity||0,
      cholesterol:n.CHOLE?.quantity||0
    };
    let score=100;
    if(stats.fat>15) score-=20;
    if(stats.sugar>15) score-=20;
    if(stats.sodium>500) score-=20;
    if(stats.cal>300) score-=10;
    if(score<0) score=0;
    let cls="good";
    if(score<50) cls="bad";
    else if(score<75) cls="warning";
    if(result){
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
      <div class="progress-bar ${cls}" style="width:${score}%">
      Skor GERD ${score}/100
      </div>
      </div>
      </div>`;
    }
    addDailyFood(input,stats.cal);
    saveHistory(input,score);
    const canvas=document.getElementById("nutritionChart");
    if(canvas){
      if(chart) chart.destroy();
      chart=new Chart(canvas,{
        type:"bar",
        data:{labels:["Kalori","Lemak","Protein","Karbo"],datasets:[{data:[stats.cal,stats.fat,stats.protein,stats.carbs]}]}
      });
    }
  }catch(e){ if(result) result.innerHTML="Error: "+e.message; }
}

// ================= DAILY TRACKER =================
function addDailyFood(food,cal){
  let today=new Date().toISOString().slice(0,10);
  let data=JSON.parse(localStorage.getItem("dailyFood"))||{};
  if(!data[today]) data[today]=[];
  data[today].push({food,cal});
  localStorage.setItem("dailyFood",JSON.stringify(data));
}

// ================= CAMERA =================
async function openCamera() {
  const video = document.getElementById("camera");
  if (!video) return;

  video.classList.remove("hidden");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = stream;
    await video.play(); // pastikan video siap
    console.log("Kamera siap");
  } catch (e) {
    alert("Kamera tidak bisa diakses: " + e.message);
  }
}

async function takePhoto() {
  const video = document.getElementById("camera");
  const img = document.getElementById("capturedImage");
  const input = document.getElementById("foodInput");
  if (!video || !img || !input || !classifier) {
    alert("Video atau AI belum siap!");
    return;
  }

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    alert("Video belum siap. Tunggu beberapa detik lalu coba lagi.");
    return;
  }

  // Ambil frame dari video
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  // Tampilkan foto
  const imageData = canvas.toDataURL("image/png");
  img.src = imageData;
  img.classList.remove("hidden");

  input.value = "Mendeteksi makanan...";

  // Klasifikasi gambar
  classifier.classify(img, (err, results) => {
    if (err) {
      console.error(err);
      input.value = "Gagal mengenali makanan";
      return;
    }

    const topLabel = results[0].label.toLowerCase();
    const matchedFood = foodList.find(f => topLabel.includes(f.name.toLowerCase()));
    input.value = matchedFood ? matchedFood.normal : topLabel;
  });
}

   
// ================= ACCOUNT =================
function saveUser(){
  const username=document.getElementById("username");
  if(!username) return;
  currentUser=username.value.trim();
  if(!currentUser){ alert("Masukkan nama akun"); return; }
  localStorage.setItem("user",currentUser);
  const welcome=document.getElementById("welcome");
  if(welcome) welcome.innerText="Halo "+currentUser;
  loadHistory();
}

// ================= HISTORY =================
function saveHistory(food,score){
  if(!currentUser) return;
  let allHist=JSON.parse(localStorage.getItem("history"))||{};
  if(!allHist[currentUser]) allHist[currentUser]=[];
  allHist[currentUser].push({food,score});
  localStorage.setItem("history",JSON.stringify(allHist));
}

function loadHistory(){
  const historyList=document.getElementById("historyList");
  if(!historyList) return;
  if(!currentUser){
    historyList.innerHTML="<p>Login dulu</p>";
    return;
  }
  let allHist=JSON.parse(localStorage.getItem("history"))||{};
  let h=allHist[currentUser]||[];
  historyList.innerHTML="";
  if(h.length===0){ historyList.innerHTML="<p>Belum ada riwayat</p>"; return; }
  h.forEach(i=>{
    historyList.innerHTML+=`<div class="card">${i.food} - Skor ${i.score}</div>`;
  });
}

// ================= BMI =================
function hitungBMI(){
  const weight=document.getElementById("weight");
  const height=document.getElementById("height");
  const bmiResult=document.getElementById("bmiResult");
  if(!weight||!height||!bmiResult) return;
  const w=parseFloat(weight.value);
  const h=parseFloat(height.value)/100;
  if(!w||!h) return;
  const bmi=w/(h*h);
  let ket="";
  if(bmi<18.5) ket="Kurus";
  else if(bmi<25) ket="Normal";
  else if(bmi<30) ket="Overweight";
  else ket="Obesitas";
  bmiResult.innerHTML=`<div class="card">IMT: ${bmi.toFixed(1)} (${ket})</div>`;
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", async () => {
  currentUser = localStorage.getItem("user") || "";
  const welcome = document.getElementById("welcome");
  if(currentUser && welcome){
    welcome.innerText = "Halo kembali " + currentUser;
  }

  foodList.sort((a,b)=>a.name.localeCompare(b.name));
  renderFoodList(foodList);

  // ================= LOAD MODEL AI =================
  if (!window.ml5) {
    alert("ML5 library belum siap. Periksa koneksi internet.");
    return;
  }

  try {
    classifier = await ml5.imageClassifier('MobileNet');
    console.log("Model MobileNet siap!");
  } catch (err) {
    console.error("Gagal memuat MobileNet:", err);
    alert("Gagal memuat model AI. Periksa koneksi internet.");
  }
});










