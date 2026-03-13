// ================= KONFIGURASI API =================
const APP_ID = "83a6c971";               // Ganti dengan ID Anda
const APP_KEY = "f57d9ecae7775582f830d07bfeecfbf4"; // Ganti dengan Key Anda
const LOGMEAL_TOKEN = "937a44034a0fac902bd07ab4bceae7a13a233497"; // Ganti jika perlu

// ================= GLOBAL VARIABEL =================
let chart;
let currentUser = localStorage.getItem("user") || "";
let cameraStream = null;

// Daftar makanan cepat pilih
const foodList = [
  { name: "Air Kelapa", normal: "1 cup coconut water" },
  { name: "Almond",    normal: "30 g almonds" },
  { name: "Apel",      normal: "100 g apple" },
  { name: "Brokoli",   normal: "100 g broccoli" },
  { name: "Wortel",    normal: "100 g carrot" },
  { name: "Cokelat",   normal: "20 g dark chocolate" },
  { name: "Ayam",      normal: "100 g chicken" },
  { name: "Salmon",    normal: "100 g salmon" },
  { name: "Telur",     normal: "1 large egg" },
  { name: "Oatmeal",   normal: "1 cup oatmeal" },
  { name: "Roti",      normal: "1 slice whole wheat bread" },
  { name: "Tempe",     normal: "100 g tempeh" },
  { name: "Yogurt",    normal: "1 cup yogurt" }
];

// ================= FUNGSI UI =================
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.add("hidden"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove("hidden");
  if (sectionId === "riwayat") loadHistory();
  if (sectionId === "food") renderFoodList(foodList);
}

// Event listener navbar
document.querySelectorAll(".navbar button").forEach(btn => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

// ================= AKUN =================
document.getElementById("saveUserBtn").addEventListener("click", () => {
  const name = document.getElementById("username").value.trim();
  currentUser = name;
  if (currentUser) {
    localStorage.setItem("user", currentUser);
    document.getElementById("welcome").innerText = "Halo, " + currentUser + " 👋";
  } else {
    localStorage.removeItem("user");
    document.getElementById("welcome").innerText = "Halo, selamat datang!";
  }
});

// ================= DAFTAR MAKANAN CEPAT =================
function renderFoodList(list) {
  const container = document.getElementById("foodListContainer");
  if (!container) return;
  container.innerHTML = "";
  list.forEach(f => {
    const div = document.createElement("div");
    div.className = "food-card";
    div.innerText = `${f.name} — ${f.normal}`;
    div.onclick = () => document.getElementById("foodInput").value = f.normal;
    container.appendChild(div);
  });
}

document.getElementById("searchFood")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = foodList.filter(f => f.name.toLowerCase().includes(query));
  renderFoodList(filtered);
});

renderFoodList(foodList);

// ================= CEK MAKANAN (EDAMAM) =================
document.getElementById("cekFoodBtn").addEventListener("click", async () => {
  const query = document.getElementById("foodInput").value.trim();
  if (!query) {
    alert("Masukkan makanan beserta takaran, contoh: 100 g apel");
    return;
  }

  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<p class='card'>⏳ Mengambil data nutrisi...</p>";

  try {
    const url = `https://api.edamam.com/api/nutrition-data?app_id=${APP_ID}&app_key=${APP_KEY}&ingr=${encodeURIComponent(query)}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — ${res.statusText}`);
    }

    const data = await res.json();

    if (data.calories === undefined) {
      resultDiv.innerHTML = "<p class='card'>❌ Makanan tidak dikenali. Coba format lain, misal '1 buah apel'.</p>";
      return;
    }

    const nutrients = data.totalNutrients || {};
    const stats = {
      cal: data.calories || 0,
      fat: nutrients.FAT?.quantity || 0,
      protein: nutrients.PROCNT?.quantity || 0,
      carbs: nutrients.CHOCDF?.quantity || 0,
      fiber: nutrients.FIBTG?.quantity || 0,
      sugar: nutrients.SUGAR?.quantity || 0,
      sodium: nutrients.NA?.quantity || 0,
      cholesterol: nutrients.CHOLE?.quantity || 0
    };

    // Skor GERD
    let score = 100;
    if (stats.fat > 15) score -= 20;
    if (stats.sugar > 15) score -= 15;
    if (stats.sodium > 500) score -= 15;
    if (stats.cal > 350) score -= 10;
    if (stats.fiber > 5) score += 5;
    score = Math.min(100, Math.max(0, score));

    let cls = "good";
    let rekomendasi = "✅ Makanan ini cukup aman untuk GERD.";
    if (score < 80) {
      cls = "warning";
      rekomendasi = "⚠️ Konsumsi dengan hati-hati, jangan berlebihan.";
    }
    if (score < 50) {
      cls = "bad";
      rekomendasi = "❌ Sebaiknya hindari. Bisa memicu asam lambung.";
    }

    resultDiv.innerHTML = `
      <div class="card">
        <div class="nutrition-grid">
          <div>🔥 Kalori: ${stats.cal.toFixed(1)} kcal</div>
          <div>🧈 Lemak: ${stats.fat.toFixed(1)} g</div>
          <div>🥩 Protein: ${stats.protein.toFixed(1)} g</div>
          <div>🍚 Karbo: ${stats.carbs.toFixed(1)} g</div>
          <div>🌾 Serat: ${stats.fiber.toFixed(1)} g</div>
          <div>🍬 Gula: ${stats.sugar.toFixed(1)} g</div>
          <div>🧂 Sodium: ${stats.sodium.toFixed(1)} mg</div>
          <div>🥚 Kolesterol: ${stats.cholesterol.toFixed(1)} mg</div>
        </div>
        <div class="progress">
          <div class="progress-bar ${cls}" style="width:${score}%">
            Skor GERD ${Math.round(score)}/100
          </div>
        </div>
        <div class="recommend">💡 ${rekomendasi}</div>
      </div>
    `;

    // Chart
    const canvas = document.getElementById("nutritionChart");
    if (chart) chart.destroy();
    if (canvas) {
      chart = new Chart(canvas, {
        type: "bar",
        data: {
          labels: ["Kalori", "Lemak", "Protein", "Karbo", "Serat", "Gula"],
          datasets: [{
            label: 'Kandungan per porsi',
            data: [stats.cal, stats.fat, stats.protein, stats.carbs, stats.fiber, stats.sugar],
            backgroundColor: ['#2E7D32', '#f57c00', '#1976D2', '#7b1fa2', '#388e3c', '#d32f2f']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

    // Simpan riwayat
    if (currentUser) {
      const history = JSON.parse(localStorage.getItem("history")) || {};
      if (!history[currentUser]) history[currentUser] = [];
      history[currentUser].push({
        food: query,
        score: Math.round(score),
        time: new Date().toLocaleString("id-ID")
      });
      localStorage.setItem("history", JSON.stringify(history));
    }

  } catch (error) {
    resultDiv.innerHTML = `<p class="card">❌ Gagal memuat: ${error.message}. Periksa koneksi atau API key.</p>`;
  }
});

// ================= BMI =================
document.getElementById("bmiBtn").addEventListener("click", () => {
  const w = parseFloat(document.getElementById("weight").value);
  const h = parseFloat(document.getElementById("height").value) / 100;
  if (!w || !h || w <= 0 || h <= 0) {
    alert("Masukkan berat & tinggi yang valid.");
    return;
  }
  const bmi = w / (h * h);
  let cat = "";
  let color = "";
  if (bmi < 18.5) { cat = "Kurus"; color = "#f57c00"; }
  else if (bmi < 25) { cat = "Normal"; color = "#2E7D32"; }
  else if (bmi < 30) { cat = "Kelebihan berat"; color = "#f57c00"; }
  else { cat = "Obesitas"; color = "#c62828"; }

  document.getElementById("bmiResult").innerHTML = `
    <div class="card" style="border-left: 5px solid ${color};">
      <strong>IMT = ${bmi.toFixed(1)}</strong> (${cat})
    </div>`;
});

// ================= KAMERA & LOGMEAL (TANPA MOBILENET) =================
const video = document.getElementById("camera");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
const capturedImg = document.getElementById("capturedImage");
const openCameraBtn = document.getElementById("openCameraBtn");

openCameraBtn.addEventListener("click", async () => {
  video.classList.remove("hidden");
  takePhotoBtn.classList.remove("hidden");
  closeCameraBtn.classList.remove("hidden");
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = cameraStream;
    await video.play();
  } catch (err) {
    alert("Tidak dapat mengakses kamera: " + err.message);
  }
});

closeCameraBtn.addEventListener("click", () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  video.classList.add("hidden");
  takePhotoBtn.classList.add("hidden");
  closeCameraBtn.classList.add("hidden");
  capturedImg.classList.add("hidden");
});

takePhotoBtn.addEventListener("click", () => {
  if (!video.videoWidth) {
    alert("Kamera belum siap.");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg");
  capturedImg.src = dataUrl;
  capturedImg.classList.remove("hidden");
  document.getElementById("foodInput").value = "🔍 Mendeteksi...";

  // Hanya gunakan LogMeal
  detectWithLogMeal(dataUrl);
});

async function detectWithLogMeal(dataUrl) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const formData = new FormData();
    formData.append("image", blob);

    const res = await fetch("https://api.logmeal.es/v2/recognition/complete", {
      method: "POST",
      headers: { "Authorization": "Bearer " + LOGMEAL_TOKEN },
      body: formData
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Kuota LogMeal habis (30-50/bulan)");
      throw new Error(`LogMeal error ${res.status}`);
    }

    const data = await res.json();
    const name = data.recognition_results?.[0]?.name || "Tidak dikenal";
    document.getElementById("foodInput").value = name;
  } catch (e) {
    console.error("LogMeal gagal:", e);
    document.getElementById("foodInput").value = "❌ Gagal mendeteksi, coba manual.";
    // Tidak ada fallback ke MobileNet
  }
}

// ================= RIWAYAT & EKSPOR CSV =================
function loadHistory() {
  const listDiv = document.getElementById("historyList");
  listDiv.innerHTML = "";
  if (!currentUser) {
    listDiv.innerHTML = "<p class='card'>🔒 Login untuk melihat riwayat.</p>";
    return;
  }
  const history = JSON.parse(localStorage.getItem("history"))?.[currentUser] || [];
  if (history.length === 0) {
    listDiv.innerHTML = "<p class='card'>📭 Belum ada riwayat.</p>";
    return;
  }
  history.slice().reverse().forEach(item => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<span>${item.time}</span> <strong>${item.food}</strong> <span style="color:${item.score>=80?'green':item.score>=50?'orange':'red'}">${item.score}</span>`;
    listDiv.appendChild(div);
  });
}

document.getElementById("exportCsvBtn").addEventListener("click", () => {
  if (!currentUser) return alert("Login terlebih dahulu.");
  const history = JSON.parse(localStorage.getItem("history"))?.[currentUser] || [];
  if (history.length === 0) return alert("Tidak ada data.");
  let csv = "Waktu,Makanan,Skor\n";
  history.forEach(i => csv += `"${i.time}","${i.food}",${i.score}\n`);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `riwayat_${currentUser}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ================= INIT =================
if (currentUser) {
  document.getElementById("welcome").innerText = "Halo kembali, " + currentUser + " 👋";
}
