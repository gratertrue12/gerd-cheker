// === API KEYS ===
// Insert your own keys below
const APP_ID = "83a6c971";
const APP_KEY = "f57d9ecae7775582f830d07bfeecfbf4";
const LOGMEAL_TOKEN = "937a44034a0fac902bd07ab4bceae7a13a233497";

let chart;
let currentUser = "";

// Food list for quick selection
const foodList = [
  { name: "Air Kelapa", normal: "1 cup coconut water" },
  { name: "Almond",    normal: "30 g almonds" },
  { name: "Apel",      normal: "100 g apple" },
  { name: "Broccoli",  normal: "100 g broccoli" },
  { name: "Carrot",    normal: "100 g carrot" },
  { name: "Chocolate", normal: "20 g dark chocolate" },
  { name: "Chicken",   normal: "100 g chicken" },
  { name: "Salmon",    normal: "100 g salmon" },
  { name: "Egg",       normal: "1 large egg" },
  { name: "Oatmeal",   normal: "1 cup oatmeal" },
  { name: "Bread",     normal: "1 slice whole wheat bread" },
  { name: "Tempeh",    normal: "100 g tempeh" },
  { name: "Yogurt",    normal: "1 cup yogurt" }
];

// Mapping common labels to foods
const mapping = {
  "bottle": "water",
  "iced tea": "tea",
  "espresso": "coffee",
  "cappuccino": "coffee"
};

// Show/hide sections based on tab click
document.querySelectorAll(".navbar button").forEach(btn => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.add("hidden"));
  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
  if (id === "riwayat") loadHistory();
}

// Account (optional)
document.getElementById("saveUserBtn").addEventListener("click", () => {
  const name = document.getElementById("username").value.trim();
  currentUser = name;
  if (currentUser) {
    localStorage.setItem("user", currentUser);
    document.getElementById("welcome").innerText = "Halo " + currentUser;
  } else {
    document.getElementById("welcome").innerText = "Halo, selamat datang!";
  }
});

// Render food list and search
function renderFoodList(list) {
  const container = document.getElementById("foodListContainer");
  container.innerHTML = "";
  list.forEach(f => {
    const div = document.createElement("div");
    div.className = "food-card";
    div.innerText = `${f.name} - ${f.normal}`;
    div.onclick = () => document.getElementById("foodInput").value = f.normal;
    container.appendChild(div);
  });
}
document.getElementById("searchFood").addEventListener("input", () => {
  const query = document.getElementById("searchFood").value.toLowerCase();
  renderFoodList(foodList.filter(f => f.name.toLowerCase().includes(query)));
});
renderFoodList(foodList);

// "Cek Makanan" button action
document.getElementById("cekFoodBtn").addEventListener("click", async () => {
  const query = document.getElementById("foodInput").value.trim();
  if (!query) {
    alert("Masukkan makanan contoh: 100 g apel");
    return;
  }
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<p>Loading...</p>";

  // Call Edamam API
  try {
    const res = await fetch(`https://api.edamam.com/api/nutrition-data?app_id=${APP_ID}&app_key=${APP_KEY}&ingr=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.ingredients?.[0]?.parsed?.[0]) {
      resultDiv.innerHTML = "<p>Data tidak ditemukan</p>";
      return;
    }
    const n = data.ingredients[0].parsed[0].nutrients;
    const stats = {
      cal: n.ENERC_KCAL?.quantity||0,
      fat: n.FAT?.quantity||0,
      protein: n.PROCNT?.quantity||0,
      carbs: n.CHOCDF?.quantity||0,
      fiber: n.FIBTG?.quantity||0,
      sugar: n.SUGAR?.quantity||0,
      sodium: n.NA?.quantity||0,
      cholesterol: n.CHOLE?.quantity||0
    };
    // Compute GERD score
    let score = 100;
    if (stats.fat > 15) score -= 20;
    if (stats.sugar > 15) score -= 20;
    if (stats.sodium > 500) score -= 20;
    if (stats.cal > 300) score -= 10;
    if (score < 0) score = 0;
    let cls = "good";
    if (score < 50) cls = "bad";
    else if (score < 75) cls = "warning";

    // Display result
    resultDiv.innerHTML = `
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
      </div>
    `;
    // Draw chart
    const canvas = document.getElementById("nutritionChart");
    if (canvas) {
      if (chart) chart.destroy();
      chart = new Chart(canvas, {
        type: "bar",
        data: {
          labels: ["Kalori","Lemak","Protein","Karbo"],
          datasets: [{ data: [stats.cal,stats.fat,stats.protein,stats.carbs] }]
        }
      });
    }
    // Save history
    saveHistory(query, score);
  } catch (e) {
    resultDiv.innerHTML = `<p>Error: ${e.message}</p>`;
  }
});

// Save history per user
function saveHistory(food, score) {
  if (!currentUser) return;
  let allHist = JSON.parse(localStorage.getItem("history"))||{};
  if (!allHist[currentUser]) allHist[currentUser] = [];
  allHist[currentUser].push({food, score});
  localStorage.setItem("history", JSON.stringify(allHist));
}

// Load history list
function loadHistory() {
  const listDiv = document.getElementById("historyList");
  listDiv.innerHTML = "";
  if (!currentUser) {
    listDiv.innerHTML = "<p>Akun tidak diset. Tidak ada riwayat.</p>";
    return;
  }
  let h = JSON.parse(localStorage.getItem("history"))?.[currentUser] || [];
  if (h.length === 0) {
    listDiv.innerHTML = "<p>Belum ada riwayat.</p>";
    return;
  }
  h.forEach(i => {
    const div = document.createElement("div");
    div.className = "card";
    div.textContent = `${i.food} - Skor ${i.score}`;
    listDiv.appendChild(div);
  });
}

// BMI calculation
document.getElementById("bmiBtn").addEventListener("click", () => {
  const w = parseFloat(document.getElementById("weight").value);
  const h = parseFloat(document.getElementById("height").value) / 100;
  if (!w || !h) return;
  const bmi = w / (h*h);
  let cat = bmi < 18.5 ? "Kurus" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obesitas";
  document.getElementById("bmiResult").innerHTML = `<div class="card">IMT: ${bmi.toFixed(1)} (${cat})</div>`;
});

// Camera setup
document.getElementById("openCameraBtn").addEventListener("click", async () => {
  const video = document.getElementById("camera");
  video.classList.remove("hidden");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
    await video.play();
  } catch (e) {
    alert("Kamera tidak bisa diakses: " + e.message);
  }
});

// Take photo and recognize
document.getElementById("takePhotoBtn").addEventListener("click", async () => {
  const video = document.getElementById("camera");
  const img = document.getElementById("capturedImage");
  if (!video.videoWidth) {
    alert("Video belum siap");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg");
  img.src = dataUrl;
  img.classList.remove("hidden");
  document.getElementById("foodInput").value = "Mendeteksi makanan...";

  // Call LogMeal API
  try {
    const formData = new FormData();
    const blob = await (await fetch(dataUrl)).blob();
    formData.append("image", blob);
    const res = await fetch("https://api.logmeal.es/v2/recognition/complete", {
      method: "POST",
      headers: { "Authorization": "Bearer " + LOGMEAL_TOKEN },
      body: formData
    });
    if (res.status === 429) {
      alert("Kuota LogMeal habis (30-50/bulan). Coba lagi bulan depan.");
      return;
    }
    const data = await res.json();
    const name = data.recognition_results?.[0]?.name || "Tidak dikenal";
    document.getElementById("foodInput").value = name;
  } catch (e) {
    console.warn("LogMeal error, fallback ke MobileNet", e);
    // MobileNet fallback
    classifier.classify(img, (err, results) => {
      if (err) { document.getElementById("foodInput").value = "Gagal mengenali"; return; }
      let label = results[0].label.toLowerCase();
      for (const key in mapping) {
        if (label.includes(key)) {
          label = mapping[key];
          break;
        }
      }
      const found = foodList.find(f => label.includes(f.name.toLowerCase()));
      document.getElementById("foodInput").value = found ? found.normal : label;
    });
  }
});

// Load ml5 MobileNet (for fallback)
let classifier;
ml5.imageClassifier('MobileNet')
  .then(c => { classifier = c; console.log("MobileNet siap"); })
  .catch(err => console.error("ML5 load error:", err));

// Initial user greeting
window.addEventListener("load", () => {
  currentUser = localStorage.getItem("user") || "";
  if (currentUser) {
    document.getElementById("welcome").innerText = "Halo kembali " + currentUser;
  }
});


