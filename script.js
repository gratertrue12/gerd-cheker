// === API KEYS (Insert your own) ===
const EDAMAM_APP_ID = '83a6c971';
const EDAMAM_APP_KEY = 'f57d9ecae7775582f830d07bfeecfbf4';
const LOGMEAL_API_KEY = '937a44034a0fac902bd07ab4bceae7a13a233497';

// In development, use dummy data to save LogMeal credits:
// const dataDummy = { name: "Coffee with Milk", confidence: 0.95 };
// console.log(dataDummy.name);

let chart, classifier;
let currentUser = "";

// Example food list for mapping to Edamam input
const foodList = [
  { name: "Air Kelapa", normal: "1 cup coconut water" },
  { name: "Almond", normal: "30 g almonds" },
  { name: "Anggur", normal: "100 g grapes" },
  { name: "Apel", normal: "100 g apple" },
  { name: "Brokoli", normal: "100 g broccoli" },
  { name: "Buncis", normal: "100 g green beans" },
  { name: "Carrot", normal: "100 g carrot" },
  { name: "Cokelat Hitam", normal: "20 g dark chocolate" },
  { name: "Cornflakes", normal: "1 cup cornflakes" },
  { name: "Daging Ayam", normal: "100 g chicken" },
  { name: "Daging Sapi", normal: "100 g beef" },
  { name: "Ikan Salmon", normal: "100 g salmon" },
  { name: "Ikan Tuna", normal: "100 g tuna" },
  { name: "Jagung", normal: "100 g corn" },
  { name: "Kentang", normal: "100 g potato" },
  { name: "Kiwi", normal: "100 g kiwi" },
  { name: "Mangga", normal: "100 g mango" },
  { name: "Melon", normal: "100 g cantaloupe" },
  { name: "Nanas", normal: "100 g pineapple" },
  { name: "Oatmeal", normal: "1 cup oatmeal" },
  { name: "Orange", normal: "100 g orange" },
  { name: "Papaya", normal: "100 g papaya" },
  { name: "Peanut Butter", normal: "20 g peanut butter" },
  { name: "Roti Gandum", normal: "1 slice whole wheat bread" },
  { name: "Semangka", normal: "100 g watermelon" },
  { name: "Strawberry", normal: "100 g strawberry" },
  { name: "Tempe", normal: "100 g tempeh" },
  { name: "Telur Ayam", normal: "1 large egg" },
  { name: "Tofu", normal: "100 g tofu" },
  { name: "Tomat", normal: "100 g tomato" },
  { name: "Yogurt", normal: "1 cup yogurt" }
];

// Mapping for ambiguous labels (e.g. bottle -> water/tea)
const mapping = {
  "iced tea": "tea",
  "espresso": "coffee",
  "bottle": "water"
};

// Initialize app
window.addEventListener("DOMContentLoaded", async () => {
  currentUser = localStorage.getItem("user") || "";
  if (currentUser) {
    document.getElementById("welcome").innerText = "Halo kembali " + currentUser;
  }

  // Sort food list and render
  foodList.sort((a,b) => a.name.localeCompare(b.name));
  renderFoodList(foodList);

  // Load MobileNet model
  try {
    classifier = await ml5.imageClassifier('MobileNet');
    console.log("MobileNet siap");
  } catch (err) {
    alert("Gagal memuat model AI. Periksa koneksi internet.");
    console.error(err);
  }
});

// Show/Hide sections
function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.add("hidden"));
  const secEl = document.getElementById(id);
  if (secEl) {
    secEl.classList.remove("hidden");
    if (id === "riwayat") loadHistory();
  }
}

// Save username (optional)
function saveUser() {
  const name = document.getElementById("username").value.trim();
  currentUser = name;
  if (currentUser) {
    localStorage.setItem("user", currentUser);
    document.getElementById("welcome").innerText = "Halo " + currentUser;
  } else {
    document.getElementById("welcome").innerText = "Halo, silakan cek makanan";
  }
  loadHistory();
}

// Render food list for selection
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

// Search filter
function searchFood() {
  const query = document.getElementById("searchFood").value.toLowerCase();
  const filtered = foodList.filter(f => f.name.toLowerCase().includes(query));
  renderFoodList(filtered);
}

// Main function to check food and compute GERD score
async function cekFood() {
  const inputEl = document.getElementById("foodInput");
  const query = inputEl.value.trim();
  const resultDiv = document.getElementById("result");
  if (!query) {
    alert("Masukkan makanan (misal: 100 g apple).");
    return;
  }

  // Check cache first
  const cache = JSON.parse(localStorage.getItem("cache")) || {};
  if (cache[query]) {
    // Use cached stats if available
    displayNutritionResult(cache[query], resultDiv);
    return;
  }

  resultDiv.innerHTML = "<p>Loading...</p>";
  const url = `https://api.edamam.com/api/nutrition-data?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ingredients || !data.ingredients[0].parsed) {
      resultDiv.innerHTML = "<p>Data tidak ditemukan.</p>";
      return;
    }
    const n = data.ingredients[0].parsed[0].nutrients;
    const stats = {
      cal: n.ENERC_KCAL?.quantity || 0,
      fat: n.FAT?.quantity || 0,
      protein: n.PROCNT?.quantity || 0,
      carbs: n.CHOCDF?.quantity || 0,
      fiber: n.FIBTG?.quantity || 0,
      sugar: n.SUGAR?.quantity || 0,
      sodium: n.NA?.quantity || 0,
      cholesterol: n.CHOLE?.quantity || 0
    };
    // Cache the stats
    cache[query] = stats;
    localStorage.setItem("cache", JSON.stringify(cache));

    displayNutritionResult(stats, resultDiv);
    addDailyFood(query, stats.cal);
    saveHistory(query, computeScore(stats));
    drawChart(stats);
  } catch (err) {
    resultDiv.innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

// Helper to compute and display nutrition & score
function displayNutritionResult(stats, resultDiv) {
  const score = computeScore(stats);
  let cls = score < 50 ? "bad" : score < 75 ? "warning" : "good";
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
    </div>`;
}

// Compute GERD score
function computeScore(stats) {
  let score = 100;
  if (stats.fat > 15) score -= 20;
  if (stats.sugar > 15) score -= 20;
  if (stats.sodium > 500) score -= 20;
  if (stats.cal > 300) score -= 10;
  return Math.max(score, 0);
}

// Draw Chart.js bar chart of nutrients
function drawChart(stats) {
  const canvas = document.getElementById("nutritionChart");
  if (!canvas) return;
  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Kalori','Lemak','Protein','Karbo'],
      datasets: [{ data: [stats.cal, stats.fat, stats.protein, stats.carbs] }]
    }
  });
}

// Save daily food intake (simple tracker)
function addDailyFood(food, cal) {
  const today = new Date().toISOString().slice(0,10);
  const data = JSON.parse(localStorage.getItem("dailyFood")) || {};
  if (!data[today]) data[today] = [];
  data[today].push({food, cal});
  localStorage.setItem("dailyFood", JSON.stringify(data));
}

// Camera: open device camera
async function openCamera() {
  const video = document.getElementById("camera");
  video.classList.remove("hidden");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
  } catch (e) {
    alert("Kamera tidak dapat diakses: " + e.message);
  }
}

// Take photo, then recognize using LogMeal or MobileNet
async function takePhoto() {
  const video = document.getElementById("camera");
  const img = document.getElementById("capturedImage");
  const input = document.getElementById("foodInput");
  if (!video || !classifier) {
    alert("Video atau AI belum siap!");
    return;
  }
  if (video.videoWidth === 0) {
    alert("Video belum siap. Tunggu beberapa detik lalu coba lagi.");
    return;
  }
  // Capture frame
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);

  // Show captured image
  const dataURL = canvas.toDataURL("image/png");
  img.src = dataURL;
  img.classList.remove("hidden");

  input.value = "Mendeteksi makanan...";

  // Convert to Blob
  canvas.toBlob(async blob => {
    // Call LogMeal API
    try {
      const formData = new FormData();
      formData.append('image', blob);
      const res = await fetch('https://api.logmeal.com/v2/image/segmentation/complete', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + LOGMEAL_API_KEY },
        body: formData
      });
      if (res.status === 429) {
        alert("Quota LogMeal habis. Tunggu bulan depan.");
        return;
      }
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      if (data.dishes && data.dishes.length > 0) {
        // Use the top recognized dish name
        input.value = data.dishes[0].name;
        return;
      }
    } catch (err) {
      console.warn("LogMeal gagal, gunakan MobileNet:", err);
      // Fall back to MobileNet below
    }
    // Fallback: use MobileNet classifier
    classifier.classify(img, (err, results) => {
      if (err) {
        console.error(err);
        input.value = "Gagal mengenali makanan";
        return;
      }
      let label = results[0].label.toLowerCase();
      // Apply manual mapping for beverages
      for (const key in mapping) {
        if (label.includes(key)) {
          label = mapping[key];
          break;
        }
      }
      // Find matching food item
      const match = foodList.find(f => label.includes(f.name.toLowerCase()));
      input.value = match ? match.normal : label;
    });
  }, 'image/png');
}

// History: save and load usage history
function saveHistory(food, score) {
  if (!currentUser) return;
  const allHist = JSON.parse(localStorage.getItem("history")) || {};
  if (!allHist[currentUser]) allHist[currentUser] = [];
  allHist[currentUser].push({food, score});
  localStorage.setItem("history", JSON.stringify(allHist));
}

function loadHistory() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";
  if (!currentUser) {
    historyList.innerHTML = "<p>Masukkan nama akun untuk melihat riwayat.</p>";
    return;
  }
  const allHist = JSON.parse(localStorage.getItem("history")) || {};
  const h = allHist[currentUser] || [];
  if (h.length === 0) {
    historyList.innerHTML = "<p>Belum ada riwayat.</p>";
    return;
  }
  h.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";
    div.textContent = `${item.food} - Skor ${item.score}`;
    historyList.appendChild(div);
  });
}

// BMI Calculator
function hitungBMI() {
  const w = parseFloat(document.getElementById("weight").value);
  const h = parseFloat(document.getElementById("height").value)/100;
  if (!w || !h) return;
  const bmi = w / (h*h);
  let category = "";
  if (bmi < 18.5) category = "Kurus";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obesitas";
  document.getElementById("bmiResult").innerHTML =
    `<div class="card">IMT: ${bmi.toFixed(1)} (${category})</div>`;
}
