const firebaseConfig = {
  apiKey: "AIzaSyBVVhuktrqcs5rFNqVLDTvPAybwAJcF-Kc",
  authDomain: "air-quality-monitor-80a0c.firebaseapp.com",
  databaseURL: "https://air-quality-monitor-80a0c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "air-quality-monitor-80a0c",
  storageBucket: "air-quality-monitor-80a0c.firebasestorage.app",
  messagingSenderId: "625949588545",
  appId: "1:625949588545:web:479e4636bf048615e19ac0"
};

  // ✅ เริ่มต้น Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // ✅ ดึงสถานะปั๊มจาก path เช่น /pump/status
const realtimePumpStatusRef = firebase.database().ref("pump_status_now");

realtimePumpStatusRef.on("value", (snapshot) => {
  const status = snapshot.val();
  const label = document.getElementById("pumpStatusLabel");

  if (status === "ON") {
    label.textContent = "กำลังทำงาน (ON)";
    label.className = "badge rounded-pill bg-success px-3 py-1";
  } else if (status === "OFF") {
    label.textContent = "หยุดทำงาน (OFF)";
    label.className = "badge rounded-pill bg-danger px-3 py-1";
  } else {
    label.textContent = "ไม่ทราบสถานะ";
    label.className = "badge rounded-pill bg-secondary px-3 py-1";
  }
});



// ✅ ย้ายไว้ด้านนอกเพื่อให้เรียกได้ทุกที่
function triggerAlert(message) {
  const toggleAlerts = document.getElementById('toggleAlerts');
  const alertSound = document.getElementById('alertSound');
  const alertPopup = document.getElementById('alertPopup');

  if (!toggleAlerts?.checked) return;

  if (alertSound?.checked) {
    const player = document.getElementById('alertSoundPlayer');
    player.pause();
    player.currentTime = 0;
    player.play().catch(err => console.warn("เล่นเสียงล้มเหลว:", err));
  }

  if (alertPopup?.checked) {
    Swal.fire({
      icon: 'warning',
      title: 'แจ้งเตือนค่าฝุ่นเกิน!',
      html: `<strong>${message.replace(/\n/g, '<br>')}</strong>`,
      confirmButtonText: 'รับทราบ',
      background: '#222',
      color: '#fff'
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // ✅ ควบคุมเปิด-ปิดแจ้งเตือนทั้งหมด
const toggleAlerts = document.getElementById('toggleAlerts');
const alertSound = document.getElementById('alertSound');
const alertPopup = document.getElementById('alertPopup');

function setAlertControlsState(enabled) {
  alertSound.disabled = !enabled;
  alertPopup.disabled = !enabled;
}
// 🔁 เมื่อเปิด/ปิด toggle แจ้งเตือน
toggleAlerts.addEventListener('change', () => {
  setAlertControlsState(toggleAlerts.checked);
});
// ✅ เริ่มต้น: ตั้งค่าควบคุมตามสถานะ toggleAlerts
setAlertControlsState(toggleAlerts.checked);

  // ✅ Chart setup
  const ctx = document.getElementById('realtimeChart')?.getContext('2d');
  if (!ctx) {
    console.error("ไม่พบ canvas realtimeChart");
    return;
  }

  const realtimeChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'PM2.5',
      data: [],
      borderColor: '#ff0000', 
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      tension: 0.150
       },
    {
  label: 'PM10',
  data: [], 
  borderColor: '#0ced35',                  // ฟ้าสด
  backgroundColor: 'rgba(10, 241, 72, 0.18)', // ฟ้าจางแบบโปร่งใส
  borderWidth: 2,
  pointRadius: 0,
  fill: true,
  tension: 0.150
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 10 },
    plugins: {
      legend: {
        labels: {
          color: '#fff',         // ✅ สีข้อความ legend
          font: { size: 14 }
        }
      },
      tooltip: {
        bodyColor: '#fff',
        titleColor: '#fff',
        backgroundColor: '#333',
        titleFont: { size: 14 },
        bodyFont: { size: 14 }
      }
    },
 scales: {
  x: {
   offset: false, // ✅ ปิดช่องว่างด้านซ้าย-ขวา
  title: {
    display: true,
    text: 'Time',
    color: '#fff',
    font: { size: 24 }
    },
    ticks: {
    color: '#fff',
    font: { size: 18 },
    maxTicksLimit: 10,
      callback: function(value, index, ticks) {
        // 🕒 ฟอร์แมตเวลาจาก label
        const timeString = this.getLabelForValue(value);
        // คาดว่าเวลาอยู่ในรูปแบบ HH:mm:ss เช่น "15:23:27"
        const [hh, mm] = timeString.split(':');
        return `${hh}:${mm}`;
      }
    },
    grid: {
      color: 'rgba(255,255,255,0.1)'
    }
  },

  y: {
    title: {
      display: true,
      text: 'µg/m³',
      color: '#fff',
      font: { size: 24}
    },
    ticks: {
      color: '#fff',
      font: { size: 18 }
    },
    grid: {
      color: 'rgba(255,255,255,0.1)'
    }
  }

}
}
});
// ✅ เพิ่มหลังจาก chart ถูกสร้าง
document.getElementById('showPM25').addEventListener('change', function () {
  realtimeChart.data.datasets[0].hidden = !this.checked;
  realtimeChart.update();
});
document.getElementById('showPM10').addEventListener('change', function () {
  realtimeChart.data.datasets[1].hidden = !this.checked;
  realtimeChart.update();
});

  // ✅ Firebase sensor data
  const sensorRef = firebase.database().ref("iot_data").limitToLast(20);
  sensorRef.on("value", (snapshot) => {
    const rawData = snapshot.val();
    if (!rawData) return;

    const keys = Object.keys(rawData);
    realtimeChart.data.labels = [];
    realtimeChart.data.datasets[0].data = []; // PM2.5
    realtimeChart.data.datasets[1].data = []; // PM10

    keys.forEach(key => {
    const time = rawData[key].timestamp?.split(" ")[1] || key.split("_")[1];
    realtimeChart.data.labels.push(time);
    realtimeChart.data.datasets[0].data.push(rawData[key].pm25 || 0);
    realtimeChart.data.datasets[1].data.push(rawData[key].pm10 || 0);
    });

    realtimeChart.update();

    // ✅ อัปเดต AQI จากข้อมูลล่าสุด
    const latest = rawData[keys[keys.length - 1]];
    updateAQIDisplay(latest.pm25 ?? 0, latest.pm10 ?? 0);
    // ✅ เพิ่มการแจ้งเตือนถ้าค่าฝุ่นเกินเกณฑ์ที่ผู้ใช้ตั้งไว้
    const pm25Threshold = parseInt(document.getElementById("pm25Input").value);
    const pm10Threshold = parseInt(document.getElementById("pm10Input").value);
    if ((latest.pm25 >= pm25Threshold) || (latest.pm10 >= pm10Threshold)) {
   triggerAlert(`⚠️ ค่าฝุ่นเกินที่กำหนด!\nPM2.5: ${latest.pm25} µg/m³\nPM10: ${latest.pm10} µg/m³`);
}
  });

  // ✅ ปั๊มน้ำ
  const pumpControlRef = firebase.database().ref("pump_control");
  const autoManualToggle = document.getElementById("autoManualToggle");
  const pumpToggle = document.getElementById("pumpToggle");
  const pm25Input = document.getElementById("pm25Input");
  const pm10Input = document.getElementById("pm10Input");

  pumpControlRef.on("value", (snapshot) => {
    const data = snapshot.val();
    const isManual = data.mode === "manual";

    autoManualToggle.checked = !isManual;
    pumpToggle.disabled = !isManual;
    pumpToggle.checked = data.manual_status === true;

    pm25Input.value = data.thresholdPM25;
    pm10Input.value = data.thresholdPM10;
    pm25Input.disabled = isManual;
    pm10Input.disabled = isManual;
  });

  autoManualToggle.addEventListener("change", (e) => {
    pumpControlRef.update({
      mode: e.target.checked ? "auto" : "manual",
      manual_status: false
    });
  });

  pumpToggle.addEventListener("change", (e) => {
    pumpControlRef.update({ manual_status: e.target.checked });
  });

  pm25Input.addEventListener("change", (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) pumpControlRef.update({ thresholdPM25: val });
  });

  pm10Input.addEventListener("change", (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) pumpControlRef.update({ thresholdPM10: val });
  });

  // ✅ แสดง Gauge
  firebase.database().ref("iot_data").limitToLast(1).on("value", (snapshot) => {
    const dataObj = snapshot.val();
    if (!dataObj) return;
    const lastKey = Object.keys(dataObj)[0];
    const data = dataObj[lastKey];
    if (!data.timestamp) return; // ❗ กันข้อมูล invalid

    console.log("Gauge data:", data);
    drawGauge('gauge-pm25', data.pm25, 100, 'µg/m³', '#ffcc00');
    drawGauge('gauge-pm10', data.pm10, 200, 'µg/m³', '#ff9933');
    drawGauge('gauge-temp', data.temperature, 50, '°C', '#00bfff');
    drawGauge('gauge-humid', data.humidity, 100, '%', '#00bfff');


  });
});

// ✅ วาด Gauge
function drawGauge(canvasId, value, max, unit, color) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(140, 140, 120, Math.PI, 0);
  ctx.lineWidth = 20;
  ctx.strokeStyle = "#eee";
  ctx.stroke();

  const endAngle = Math.PI + (Math.PI * (value / max));
  ctx.beginPath();
  ctx.arc(140, 140, 120, Math.PI, endAngle);
  ctx.lineWidth = 20;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.font = "32px 'Sarabun', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(value !== undefined ? value : '-', 140, 140);
  ctx.font = "20px 'Sarabun', sans-serif";
  ctx.fillText(unit, 140, 170);
}


// ✅ คำนวณ AQI และอัปเดต UI
const AQI_TABLE = [
  { min: 0, max: 25, face: 'excellent', color: '#87cefa' },
  { min: 26, max: 50, face: 'good', color: '#32cd32' },
  { min: 51, max: 100, face: 'neutral', color: '#ffa500' },
  { min: 101, max: 200, face: 'mask', color: '#ff4500' },
  { min: 201, max: Infinity, face: 'danger', color: '#b22222' }
];

function getAQIFromPM(pm25, pm10) {
  const pm25AQI = getAQILevel(pm25, 'pm25');
  const pm10AQI = getAQILevel(pm10, 'pm10');
  return pm25AQI.aqi > pm10AQI.aqi ? pm25AQI : pm10AQI;
}

function getAQILevel(value, type) {
  let aqi = 0;
  if (type === 'pm25') {
    if (value <= 25) aqi = value;
    else if (value <= 37) aqi = 30 + (value - 26);
    else if (value <= 50) aqi = 51 + (value - 38);
    else if (value <= 90) aqi = 101 + (value - 51);
    else aqi = 200 + (value - 91);
  } else if (type === 'pm10') {
    if (value <= 50) aqi = value / 2;
    else if (value <= 80) aqi = 30 + (value - 51);
    else if (value <= 120) aqi = 51 + (value - 81);
    else if (value <= 180) aqi = 101 + (value - 121);
    else aqi = 200 + (value - 181);
  }
  const ref = AQI_TABLE.find(r => aqi >= r.min && aqi <= r.max);
  return { aqi: Math.round(aqi), face: ref.face, color: ref.color };
}

function updateAQIDisplay(pm25, pm10) {
  const aqiResult = getAQIFromPM(pm25, pm10);
  document.getElementById('aqi-face').src = `image/${aqiResult.face}.png`;
  drawAQIScaleBar("aqiScaleBar", aqiResult.aqi);

  // ✅ เรียกเตือนเมื่อ AQI เกิน
  if (aqiResult.aqi > 100) {
    triggerAlert(`⚠️ AQI สูง: ${aqiResult.aqi}`);
  }
}



// ✅ วาดแท่ง AQI bar
function drawAQIScaleBar(canvasId, aqi) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const barHeight = 30;
  const barY = 30;
  const sectionWidth = width / AQI_TABLE.length;

  // วาดแถบสี
  AQI_TABLE.forEach((range, i) => {
    ctx.fillStyle = range.color;
    ctx.fillRect(i * sectionWidth, barY, sectionWidth, barHeight);
  });

  // คำนวณตำแหน่ง pointer
  let pointerX = 0;
  if (aqi <= 25) {
    pointerX = (aqi / 25) * sectionWidth;
  } else if (aqi <= 50) {
    pointerX = sectionWidth + ((aqi - 26) / (50 - 26)) * sectionWidth;
  } else if (aqi <= 100) {
    pointerX = sectionWidth * 2 + ((aqi - 51) / (100 - 51)) * sectionWidth;
  } else if (aqi <= 200) {
    pointerX = sectionWidth * 3 + ((aqi - 101) / (200 - 101)) * sectionWidth;
  } else {
    pointerX = sectionWidth * 4 + ((aqi - 201) / (500 - 201)) * sectionWidth;
  }

  // วาดลูกศร pointer
  ctx.beginPath();
  ctx.moveTo(pointerX, barY - 5);
  ctx.lineTo(pointerX - 8, barY - 20);
  ctx.lineTo(pointerX + 8, barY - 20);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}
function loadHourlyAverages() {
  const ctx = document.getElementById("averageChart")?.getContext("2d");
  if (!ctx) return;

  const sensorRef = firebase.database().ref("iot_data");

  sensorRef.once("value", (snapshot) => {
    const rawData = snapshot.val();
    if (!rawData) return;

    // เตรียม array 24 ช่อง (0–23)
    const hourly = Array.from({ length: 24 }, () => ({ pm25: [], pm10: [] }));

    Object.values(rawData).forEach(entry => {
      const [dateStr, timeStr] = entry.timestamp?.split(" ") || [];
      const hour = parseInt(timeStr?.split(":")[0]);

      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        if (entry.pm25) hourly[hour].pm25.push(entry.pm25);
        if (entry.pm10) hourly[hour].pm10.push(entry.pm10);
      }
    });

    const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const pm25 = hourly.map(h => avg(h.pm25));
    const pm10 = hourly.map(h => avg(h.pm10));

    if (window.averageChartInstance) window.averageChartInstance.destroy();
    window.averageChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
       datasets: [
  ...(types.includes('pm25') ? [{
    label: 'PM2.5',
    data: datasetsMap.pm25.data,
    borderColor: '#ff4d4d',
    backgroundColor: 'rgba(255, 77, 77, 0.4)',
    borderWidth: 2,
    fill: true,
    tension: 0.4,
    pointRadius: 0
  }] : []),
  ...(types.includes('pm10') ? [{
    label: 'PM10',
    data: datasetsMap.pm10.data,
    borderColor: '#00cc44',
    backgroundColor: 'rgba(0, 204, 68, 0.4)',
    borderWidth: 2,
    fill: true,
    tension: 0.4,
    pointRadius: 0
  }] : []),
  ...(types.includes('temp') ? [{
    label: 'Temperature (°C)',
    data: datasetsMap.temp.data,
    borderColor: '#ffcc00',
    backgroundColor: 'rgba(255, 204, 0, 0.3)',
    borderWidth: 2,
    fill: false,
    tension: 0.4,
    pointStyle: 'rectRot',
    borderDash: [5, 5],
    yAxisID: 'y2'
  }] : []),
  ...(types.includes('humid') ? [{
    label: 'Humidity (%)',
    data: datasetsMap.humid.data,
    borderColor: '#00bfff',
    backgroundColor: 'rgba(0, 191, 255, 0.3)',
    borderWidth: 2,
    fill: false,
    tension: 0.4,
    pointStyle: 'circle',
    borderDash: [5, 5],
    yAxisID: 'y2'
  }] : [])
]

      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'ค่าฝุ่นเฉลี่ย',
            color: '#00e6ff',
            font: { size: 24 }
          },
          legend: {
            labels: { color: '#fff', font: { size: 20 } }
          }
        },
         scales: {
  x: {
    ticks: {
      color: '#fff',
      font: { size: 14 },
      maxRotation: 45,
      minRotation: 45
    },
    title: {
      display: true,
      text: 'วัน-เวลา',
      color: '#fff',
      font: { size: 18 }
    },
    grid: {
      color: 'rgba(255,255,255,0.05)'
    }
  },
  y: {
    beginAtZero: true,
    title: {
      display: true,
      text: 'ค่าฝุ่น (µg/m³)',
      color: '#fff',
      font: { size: 18 }
    },
    ticks: {
      color: '#fff',
      font: { size: 14 }
    },
    grid: {
      color: 'rgba(255,255,255,0.1)'
    }
  },
  y2: {
    position: 'right',
    beginAtZero: true,
    grid: { drawOnChartArea: false },
    title: {
      display: true,
      text: 'อุณหภูมิ / ความชื้น',
      color: '#fff',
      font: { size: 18 }
    },
    ticks: {
      color: '#fff',
      font: { size: 14 }
    }
  }
}

}
    });
  });
  function avg(arr) {
    if (!arr.length) return 0;
    return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  }
}
  function avg(arr) {
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  // เรียกโหลดกราฟเฉลี่ยรายเดือน
loadHourlyAverages(); // เรียกแทน loadMonthlyAverages()



let reportChartInstance = null;

function generateReport() {
  const dateStart = document.getElementById('startDate').value;
  const timeStart = document.getElementById('startTime').value;
  const dateEnd = document.getElementById('endDate').value;
  const timeEnd = document.getElementById('endTime').value;
  const view = document.getElementById('viewType').value;
  const types = ['pm25', 'pm10', 'temp', 'humid'].filter(id => document.getElementById(id).checked);
  const result = document.getElementById('reportResult');

  if (!dateStart || !dateEnd || !timeStart || !timeEnd || types.length === 0) {
    result.innerHTML = '<p class="text-danger">กรุณากรอกวันเวลาให้ครบ และเลือกข้อมูลอย่างน้อย 1 ประเภท</p>';
    return;
  }

  const start = new Date(`${dateStart}T${timeStart}`);
  const end = new Date(`${dateEnd}T${timeEnd}`);

  const typeMap = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    temp: 'Temperature',
    humid: 'Humidity'
  };

  firebase.database().ref("iot_data").once("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      result.innerHTML = '<p class="text-warning">ไม่พบข้อมูล</p>';
      return;
    }

    const filteredKeys = Object.keys(data).filter(key => {
      const timestamp = data[key].timestamp;
      if (!timestamp) return false;
      const recordTime = new Date(timestamp.replace(" ", "T"));
      return recordTime >= start && recordTime <= end;
    }).sort();

    if (filteredKeys.length === 0) {
      result.innerHTML = '<p class="text-warning">ไม่มีข้อมูลในช่วงเวลานี้</p>';
      return;
    }

    const labels = [];
    const datasetsMap = {};

    types.forEach(type => {
      datasetsMap[type] = {
        label: typeMap[type],
        data: [],
        borderWidth: 2,
        fill: false,
        tension: 0.2,
        borderColor: type === 'pm25' ? '#ff6384' :
                     type === 'pm10' ? '#36a2eb' :
                     type === 'temp' ? '#ffcc00' : '#4bc0c0'
      };
    });

    filteredKeys.forEach(key => {
      const entry = data[key];
      const timeLabel = entry.timestamp ?? key.replace("_", " ");
      labels.push(timeLabel);
      types.forEach(type => {
        datasetsMap[type].data.push(entry[type] ?? null);
      });
    });

    // ✅ ตาราง
  if (view === 'table') {
  let html = `<p>ข้อมูลย้อนหลังตั้งแต่ <strong>${dateStart} ${timeStart}</strong> ถึง <strong>${dateEnd} ${timeEnd}</strong></p>`;
  html += `<table class="table table-dark table-bordered mt-3"><thead><tr><th>วัน-เวลา</th>`;

  // แสดงหัวตารางจาก typeMap + ปั๊ม
  html += types.map(t => `<th>${typeMap[t]}</th>`).join('');
  html += `<th>สถานะปั๊มน้ำ</th></tr></thead><tbody>`;

  filteredKeys.forEach(key => {
    const row = data[key];
    html += `<tr><td>${row.timestamp ?? key.replace("_", " ")}</td>`;

    types.forEach(t => {
      html += `<td>${row[t] !== undefined ? row[t] : '-'}</td>`;
    });
types.forEach(t => {
  const field = t === 'temp' ? 'temperature' : t === 'humid' ? 'humidity' : t;
  html += `<td>${row[field] !== undefined ? row[field] : '-'}</td>`;
});

    // ✅ เพิ่มคอลัมน์สถานะปั๊มน้ำ
    const pumpStatus = row.pump_status ?? '-';
    const badge = pumpStatus === "ON"
      ? `<span class="badge bg-success">ON</span>`
      : pumpStatus === "OFF"
      ? `<span class="badge bg-danger">OFF</span>`
      : `<span class="badge bg-secondary">-</span>`;

    html += `<td>${badge}</td></tr>`;
  });

  html += `</tbody></table>`;
  result.innerHTML = html;
}
if (view === 'table') {
  let html = `<p>ข้อมูลย้อนหลังตั้งแต่ <strong>${dateStart} ${timeStart}</strong> ถึง <strong>${dateEnd} ${timeEnd}</strong></p>`;
  html += `<table class="table table-dark table-bordered mt-3"><thead><tr><th>วัน-เวลา</th>`;
  html += types.map(t => `<th>${typeMap[t]}</th>`).join('');
  html += `<th>สถานะปั๊มน้ำ</th></tr></thead><tbody>`;

  filteredKeys.forEach(key => {
    const row = data[key];
    html += `<tr><td>${row.timestamp ?? key.replace("_", " ")}</td>`;

    types.forEach(t => {
      const field = t === 'temp' ? 'temperature' :
                    t === 'humid' ? 'humidity' :
                    t;
      html += `<td>${row[field] !== undefined ? row[field] : '-'}</td>`;
    });

    const pumpStatus = row.pump_status ?? '-';
    const badge = pumpStatus === "ON"
      ? `<span class="badge bg-success">ON</span>`
      : pumpStatus === "OFF"
      ? `<span class="badge bg-danger">OFF</span>`
      : `<span class="badge bg-secondary">-</span>`;
    html += `<td>${badge}</td></tr>`;
  });

  html += `</tbody></table>`;
  result.innerHTML = html;
}


    // ✅ กราฟ
    else {
      result.innerHTML = `
        <div class="position-relative">
          <canvas id="reportChart" style="height: 600px;"></canvas>
        </div>
      `;

      const ctx = document.getElementById('reportChart').getContext('2d');
      if (reportChartInstance) reportChartInstance.destroy();

    reportChartInstance = new Chart(ctx, {
  type: 'line',
  data: {
    labels,
    datasets: Object.values(datasetsMap)
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#ffffff',
          font: { size: 20 }  // 👈 ใหญ่ขึ้น
        }
      },
      tooltip: {
        titleFont: { size: 16 },
        bodyFont: { size: 16 },
        backgroundColor: '#333',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'วัน-เวลา',
          color: '#ffffff',
          font: { size: 24 }  // 👈 ใหญ่ขึ้น
        },
        ticks: {
          color: '#ffffff',
          font: { size: 18 },  // 👈 ชัดขึ้น
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
          callback: function(value, index, ticks) {
            const step = Math.ceil(ticks.length / 10);
            return index % step === 0 ? this.getLabelForValue(value) : '';
          }
        },
        grid: { color: 'rgba(255,255,255,0.1)' }
      },
      y: {
        title: {
          display: true,
          text: 'ค่าที่วัดได้ (µg/m³)',
          color: '#ffffff',
          font: { size: 20 }
        },
        ticks: {
          color: '#ffffff',
          font: { size: 18 }
        },
        grid: {
          color: 'rgba(255,255,255,0.1)'
        }
      }
    }
  }
});

    }
  });
}










