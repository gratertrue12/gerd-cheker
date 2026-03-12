const APP_ID="83a6c971";
const APP_KEY="f57d9ecae7775582f830d07bfeecfbf4";

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
    div.onclick=()=>document.getElementById("foodInput").value=f.normal;
    container.appendChild(div);
  });
}

// ================= SEARCH =================
function searchFood(){
  const query=document.getElementById("searchFood").value.toLowerCase();
  renderFoodList(foodList.filter(f=>f.name.toLowerCase().includes(query)));
}

// ================= GERD CHECKER =================
async function cekFood(){
  const input = document.getElementById("foodInput").value.trim();
  if(!input){ alert("Masukkan makanan contoh: 100 g apple"); return; }
  const result=document.getElementById("result");
  try{
    const res=await fetch(`https://api.edamam.com/api/nutrition-data?app_id=${APP_ID}&app_key=${APP_KEY}&ingr=${encodeURIComponent(input)}`);
    const data=await res.json();
    if(!data.ingredients?.[0]?.parsed?.[0]){ result.innerHTML="Data tidak ditemukan"; return; }

    const n=data.ingredients[0].parsed[0].nutrients;
    const stats={
      cal:n.ENERC_KCAL?.quantity||0,
      fat:n.FAT?.quantity||0,
      protein:n.PROCNT?.quantity||0,
      carbs:n.CHOCDF?.quantity||0
    };
    let score=100;
    if(stats.fat>15) score-=20;
    if(stats.carbs>50) score-=20;
    if(score<0) score=0;
    let cls= score<50?"bad":score<75?"warning":"good";

    result.innerHTML=`
      <div class="card">
        <div class="nutrition-grid">
          <div>Kalori: ${stats.cal.toFixed(1)} kcal</div>
          <div>Lemak: ${stats.fat.toFixed(1)} g</div>
          <div>Protein: ${stats.protein.toFixed(1)} g</div>
          <div>Karbohidrat: ${stats.carbs.toFixed(1)} g</div>
        </div>
        <div class="progress">
          <div class="progress-bar ${cls}" style="width:${score}%">Skor GERD ${score}/100</div>
        </div>
      </div>`;

    if(chart) chart.destroy();
    chart=new Chart(document.getElementById("nutritionChart"),{
      type:"bar",
      data:{labels:["Kalori","Lemak","Protein","Karbo"],datasets:[{data:[stats.cal,stats.fat,stats.protein,stats.carbs]}]}
    });

  }catch(e){ result.innerHTML="Error: "+e.message; }
}

// ================= CAMERA =================
async function openCamera(){
  const video=document.getElementById("camera");
  video.classList.remove("hidden");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}, audio:false});
    video.srcObject=stream;
    await video.play();
  }catch(e){ alert("Kamera tidak bisa diakses: "+e.message); }
}

async function takePhoto(){
  const video=document.getElementById("camera");
  const img=document.getElementById("capturedImage");
  const input=document.getElementById("foodInput");
  if(!classifier){ alert("AI belum siap"); return; }

  const canvas=document.createElement("canvas");
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);

  img.src=canvas.toDataURL();
  img.classList.remove("hidden");
  input.value="Mendeteksi makanan...";

  classifier.classify(img,(err,results)=>{
    if(err){ input.value="Gagal mengenali makanan"; return; }
    const topLabel=results[0].label.toLowerCase();
    const matchedFood=foodList.find(f=>topLabel.includes(f.name.toLowerCase()));
    input.value=matchedFood?matchedFood.normal:topLabel;
  });
}

// ================= ACCOUNT =================
function saveUser(){
  currentUser=document.getElementById("username").value.trim();
  if(!currentUser){ alert("Masukkan nama akun"); return; }
  localStorage.setItem("user",currentUser);
  document.getElementById("welcome").innerText="Halo "+currentUser;
  loadHistory();
}

// ================= HISTORY =================
function loadHistory(){
  const historyList=document.getElementById("historyList");
  if(!currentUser){ historyList.innerHTML="<p>Login dulu</p>"; return; }
  let h=(JSON.parse(localStorage.getItem("history"))||{})[currentUser]||[];
  if(h.length===0){ historyList.innerHTML="<p>Belum ada riwayat</p>"; return; }
  historyList.innerHTML="";
  h.forEach(i=> historyList.innerHTML+=`<div class="card">${i.food} - Skor ${i.score}</div>`);
}

// ================= BMI =================
function hitungBMI(){
  const w=parseFloat(document.getElementById("weight").value);
  const h=parseFloat(document.getElementById("height").value)/100;
  if(!w||!h) return;
  const bmi=w/(h*h);
  const ket=bmi<18.5?"Kurus":bmi<25?"Normal":bmi<30?"Overweight":"Obesitas";
  document.getElementById("bmiResult").innerHTML=`<div class="card">IMT: ${bmi.toFixed(1)} (${ket})</div>`;
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", async()=>{
  currentUser=localStorage.getItem("user")||"";
  if(currentUser) document.getElementById("welcome").innerText="Halo kembali "+currentUser;
  foodList.sort((a,b)=>a.name.localeCompare(b.name));
  renderFoodList(foodList);
  classifier=await ml5.imageClassifier('MobileNet');
});
