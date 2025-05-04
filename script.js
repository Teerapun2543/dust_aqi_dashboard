
  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
  import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
  import { get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

  
  const firebaseConfig = {
    apiKey: "AIzaSyBVVhuktrqcs5rFNqVLDTvPAybwAJcF-Kc",
    authDomain: "air-quality-monitor-80a0c.firebaseapp.com",
    databaseURL: "https://air-quality-monitor-80a0c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "air-quality-monitor-80a0c",
    storageBucket: "air-quality-monitor-80a0c.appspot.com",
    messagingSenderId: "625949588545",
    appId: "1:625949588545:web:479e4636bf048615e19ac0"
  };
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const dataRef = ref(db, 'iot_data');
  onValue(dataRef, (snapshot) => {
    const dataAll = snapshot.val();
    if (!dataAll) return;
  
    let latestData = null;
    let latestTime = 0;
  
    Object.values(dataAll).forEach((entry) => {
      const ts = new Date(entry.timestamp).getTime();
      if (!isNaN(ts) && ts > latestTime) {
        latestTime = ts;
        latestData = entry;
      }
    });
  
    if (!latestData) return;
  
    const pm25 = parseFloat(latestData.pm25);
    const pm10 = parseFloat(latestData.pm10);
    const temperature = parseFloat(latestData.temperature);
    const humidity = parseFloat(latestData.humidity);
    const pumpStatus = latestData.pump_status; 
    const updateTime = new Date(latestData.timestamp).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
    displayValue('last-updated', updateTime);
    displayValue('sensor-status', 'เชื่อมต่อปกติ');
    displayValue('aqi-pm', pm25); // อัปเดต PM2.5 ด้านล่าง AQI ด้วย
    // อัปเดตค่าใน Gauge
    pm25Gauge.refresh(pm25);
    pm10Gauge.refresh(pm10);
    tempGauge.refresh(temperature);
    humidityGauge.refresh(humidity);
  
    // Update AQI and other data as needed
    const aqi = getAQILevelAndColor(pm25);
    displayValue('aqi-value', aqi.aqi);
    displayValue('aqi-level', aqi.level);
    document.getElementById('emoji-img').src = aqi.emojiImg;
    displayValue('pump-status', pumpStatus);
    document.getElementById('aqi-card').style.backgroundColor = aqi.bgColor;

  });
  function displayValue(id, value, unit = '') {
  const el = document.getElementById(id);
  if (el) el.innerText = value !== undefined ? value + unit : '--';

  // ถ้าค่าที่แสดงคือ temp/humidity และมี mini ให้อัปเดตด้วย
  if (id === 'temp-value' && document.getElementById('temp-value-mini')) {
    document.getElementById('temp-value-mini').innerText = value !== undefined ? value : '--';
  }
  if (id === 'humidity-value' && document.getElementById('humidity-value-mini')) {
    document.getElementById('humidity-value-mini').innerText = value !== undefined ? value : '--';
  }
}
function getAQILevelAndColor(pm25) {
  const val = parseFloat(pm25);
  if (val <= 25) return {
    aqi: 15,
    level: 'ดีมาก',
    color: '#3f87ff',
    bgColor: '#e6f0ff',
    emojiImg: 'images/excellent.png'
  };
  if (val <= 37) return {
    aqi: 40,
    level: 'ดี',
    color: '#28a745',
    bgColor: '#e9f7ec',
    emojiImg: 'images/good.png'
  };
  if (val <= 50) return {
    aqi: 75,
    level: 'ปานกลาง',
    color: '#ffc107',
    bgColor: '#fff9db',
    emojiImg: 'images/neutral.png'
  };
  if (val <= 90) return {
    aqi: 150,
    level: 'เริ่มมีผลต่อสุขภาพ',
    color: '#fd7e14',
    bgColor: '#ffe5cc',
    emojiImg: 'images/mask.png'
  };
  return {
    aqi: 250,
    level: 'อันตราย',
    color: '#dc3545',
    bgColor: '#ffe6e6',
    emojiImg: 'images/danger.png'
  };
}
  function getPM25Background(value) {
    if (value <= 25) return '#cce5ff';
    if (value <= 37) return '#d4edda';
    if (value <= 50) return '#fff3cd';
    if (value <= 90) return '#ffe5b4';
    return '#f8d7da';
  }
  function getPM10Background(value) {
    if (value <= 50) return '#cce5ff';
    if (value <= 80) return '#d4edda';
    if (value <= 120) return '#fff3cd';
    if (value <= 180) return '#ffe5b4';
    return '#f8d7da';
  }
  // ----- ส่วนกราฟย้อนหลัง -----
  let historyChart;
  let selectedDateStr = null;
  let selectedHours = 24;

  function createChart(labels, pm25Data, pm10Data) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    if (historyChart) historyChart.destroy();
  
    historyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'PM2.5 (µg/m³)',
            data: pm25Data,
            backgroundColor: 'rgba(255, 99, 132, 0.7)'
          },
          {
            label: 'PM10 (µg/m³)',
            data: pm10Data,
            backgroundColor: 'rgba(54, 162, 235, 0.7)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'เวลา' },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 24
            }
          },
          y: {
            title: { display: true, text: 'µg/m³' },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  }
  function safeParseTimestamp(rawTimestamp) {
    if (!rawTimestamp || typeof rawTimestamp !== 'string') {
      return new Date(NaN);
    }
    return new Date(rawTimestamp.replace(' ', 'T'));
  }
  function loadHistoryData(hours = 24) {
    const now = Date.now();
    const startTime = now - hours * 60 * 60 * 1000;
  
    get(dataRef).then(snapshot => {
      const rawData = snapshot.val();
      const grouped = {}; // สำหรับเก็บข้อมูลรายชั่วโมง
  
      Object.values(rawData).forEach(entry => {
        const ts = safeParseTimestamp(entry.timestamp);
        const time = ts.getTime();
        if (!isNaN(time) && time >= startTime && time <= now) {
          const hourLabel = ts.getHours().toString().padStart(2, '0') + ':00';
          if (!grouped[hourLabel]) grouped[hourLabel] = { pm25: [], pm10: [] };
          grouped[hourLabel].pm25.push(parseFloat(entry.pm25));
          grouped[hourLabel].pm10.push(parseFloat(entry.pm10));
        }
      });
  
      // เตรียม label และเฉลี่ยข้อมูล
      const labels = [];
      const pm25Data = [];
      const pm10Data = [];
  
      for (let i = hours - 1; i >= 0; i--) {
        const hour = new Date(now - i * 60 * 60 * 1000);
        const hourStr = hour.getHours().toString().padStart(2, '0') + ':00';
      
        labels.push(hourStr.replace(':', '.')); // ใช้ '13.00' สำหรับแสดง
      
        const group = grouped[hourStr]; // ใช้ '13:00' สำหรับค้น group
      
        if (group) {
          const avg = arr => arr.reduce((sum, v) => sum + v, 0) / arr.length;
          pm25Data.push(Number(avg(group.pm25).toFixed(1)));
          pm10Data.push(Number(avg(group.pm10).toFixed(1)));
        } else {
          pm25Data.push(null);
          pm10Data.push(null);
        }
      }
      
  
      createChart(labels, pm25Data, pm10Data);
    });
  }
  function loadHistoryDataForDate(dateStr, hours = 24) {
    const now = new Date(`${dateStr}T23:59:59`).getTime();
    const startTime = now - hours * 60 * 60 * 1000;
  
    const chartContainer = document.getElementById('historyChart');
    chartContainer.classList.add('loading');
  
    get(dataRef).then(snapshot => {
      const rawData = snapshot.val();
      const grouped = {};
  
      Object.values(rawData).forEach(entry => {
        const ts = safeParseTimestamp(entry.timestamp);
        const time = ts.getTime();
        if (!isNaN(time) && time >= startTime && time <= now) {
          const hourKey = ts.getHours().toString().padStart(2, '0') + ':00';
          if (!grouped[hourKey]) grouped[hourKey] = { pm25: [], pm10: [] };
          grouped[hourKey].pm25.push(parseFloat(entry.pm25));
          grouped[hourKey].pm10.push(parseFloat(entry.pm10));
        }
      });
  
      const labels = [];
      const pm25Data = [];
      const pm10Data = [];
  
      for (let i = hours - 1; i >= 0; i--) {
        const hour = new Date(now - i * 60 * 60 * 1000);
        const hourKey = hour.getHours().toString().padStart(2, '0') + ':00';
        const label = hourKey.replace(':', '.');
        labels.push(label);
  
        const group = grouped[hourKey];
        if (group) {
          const avg = arr => arr.reduce((sum, v) => sum + v, 0) / arr.length;
          pm25Data.push(Number(avg(group.pm25).toFixed(1)));
          pm10Data.push(Number(avg(group.pm10).toFixed(1)));
        } else {
          pm25Data.push(null);
          pm10Data.push(null);
        }
      }
  
      if (pm25Data.every(v => v === null)) {
        alert("📉 ไม่พบข้อมูลในวันที่เลือก");
      }
  
      createChart(labels, pm25Data, pm10Data);
      chartContainer.classList.remove('loading');
    });
  }
  window.addEventListener('load', () => {
    loadHistoryData(24);
  });
  document.querySelectorAll('.chart button').forEach(btn => {
    btn.addEventListener('click', () => {
      const txt = btn.innerText;
  
      if (txt.includes('1 ชั่วโมง')) selectedHours = 1;
      else if (txt.includes('6 ชั่วโมง')) selectedHours = 6;
      else if (txt.includes('24 ชั่วโมง')) selectedHours = 24;
      else if (txt.includes('7 วัน')) selectedHours = 24 * 7;
  
      // โหลดตามวันที่ที่เลือกไว้ (ถ้ามี) หรือโหลดล่าสุด
      if (selectedDateStr) {
        loadHistoryDataForDate(selectedDateStr, selectedHours);
      } else {
        loadHistoryData(selectedHours);
      }
  
      // UI: Active button
      document.querySelectorAll('.chart button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // 📅 เลือกวันที่แล้วโหลดกราฟ
  document.getElementById('datePicker').addEventListener('change', (e) => {
    selectedDateStr = e.target.value;
    if (!selectedDateStr) return;
  
    loadHistoryDataForDate(selectedDateStr, selectedHours);
  
    // UI: ให้ปุ่ม active ตรงกับช่วงเวลา
    document.querySelectorAll('.chart button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.innerText.includes(selectedHours)) btn.classList.add('active');
    });
  });
  
// 📥 เมนูดาวน์โหลด CSV/Excel
function handleDownload(type) {
  if (!historyChart) return alert("ยังไม่มีข้อมูลให้ดาวน์โหลด");

  const labels = historyChart.data.labels;
  const pm25Data = historyChart.data.datasets[0].data;
  const pm10Data = historyChart.data.datasets[1].data;

  if (type === 'csv') {
    let csv = "เวลา,PM2.5,PM10\n";
    for (let i = 0; i < labels.length; i++) {
      csv += `${labels[i]},${pm25Data[i] ?? ""},${pm10Data[i] ?? ""}\n`;
    }

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqi_data_${selectedDateStr || 'today'}_${selectedHours}h.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (type === 'pdf') {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    let y = 15;
  
    const chartEl = document.getElementById('historyChart');

pdf.setFont("THSarabunNew", "normal"); // ฟอนต์ไทย
pdf.setFontSize(20);
pdf.text("รายงานวิเคราะห์คุณภาพอากาศ", 105, y, { align: "center" });

pdf.setFontSize(14);
pdf.text(`วันที่จัดทำ: ${dateStr}`, margin, y += 10);
pdf.text(`เวลา: ${timeStr}`, margin, y += 7);
pdf.text(`สถานที่: โรงงานคอนกรีต XYZ`, margin, y += 7);

pdf.setDrawColor(0); // เส้นใต้หัวข้อ
pdf.line(margin, y += 4, 200 - margin, y);

pdf.setFontSize(16);
pdf.text("1. สรุปผลการวิเคราะห์", margin, y += 10);
pdf.setFontSize(12);
pdf.text(`- ค่าเฉลี่ย PM2.5: ${avgPM25}`, margin, y += 6);
pdf.text(`- ค่าสูงสุด: ${maxPM25}`, margin, y += 6);

  
    // ✅ จับเฉพาะ Section ที่มีรายงาน
    html2canvas(chartEl).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = imgWidth * (canvas.height / canvas.width);
  
      // ✅ แทรกภาพจากกราฟ
      pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
      pdf.save(`air_quality_${selectedDateStr || 'today'}_${selectedHours}h.pdf`);
    });
  }
  

  document.getElementById("downloadSelect").value = "";
}
// 📥 เชื่อมเมนูดาวน์โหลดกับฟังก์ชัน handleDownload
document.getElementById('downloadSelect').addEventListener('change', function () {
  const fileType = this.value;
  if (fileType === 'pdf') {
    downloadEngineeringPDFReport(); // เรียกฟังก์ชันใหม่
  } else if (fileType === 'csv') {
    handleDownloadCSV();
  }
  this.value = ''; // reset select
});

window.openHistoryModal = function () {
  document.getElementById('historyModal').style.display = 'block';
  const today = new Date().toISOString().split("T")[0];
  document.getElementById('modalDatePicker').value = today;
  loadHistoryTable(today);
};
document.getElementById('modalDatePicker').addEventListener('change', function () {
  loadHistoryTable(this.value);
});
function loadHistoryTable(dateStr) {
  if (!dateStr) return;
  const selectedDate = new Date(dateStr);
  const start = new Date(selectedDate.setHours(0, 0, 0, 0)).getTime();
  const end = new Date(selectedDate.setHours(23, 59, 59, 999)).getTime();

  get(dataRef).then(snapshot => {
    const data = snapshot.val();
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = "";

    const rows = [];

    Object.values(data).forEach(entry => {
      const ts = new Date(entry.timestamp).getTime();
      if (ts >= start && ts <= end) {
        rows.push(`
          <tr>
            <td>${new Date(ts).toLocaleTimeString('th-TH')}</td>
            <td>${entry.pm25 ?? '--'}</td>
            <td>${entry.pm10 ?? '--'}</td>
            <td>${entry.temperature ?? 'undefined'}</td>
            <td>${entry.humidity ?? 'undefined'}</td>
            <td>${entry.pump_status ?? '--'}</td>
            <td>${getAQILevel(entry.pm25)}</td>
          </tr>
        `);
      }
    });

    tbody.innerHTML = rows.length > 0 ? rows.join("") : `<tr><td colspan="7">ไม่พบข้อมูลในวันนี้</td></tr>`;
  });
}
function getAQILevel(pm25) {
  const val = parseFloat(pm25);
  if (val <= 25) return 'ดีมาก';
  if (val <= 37) return 'ดี';
  if (val <= 50) return 'ปานกลาง';
  if (val <= 90) return 'เริ่มมีผล';
  return 'อันตราย';
}
// สร้างตัวแปร Gauge สำหรับแต่ละค่า
var pm25Gauge = new JustGage({
  id: "gauge-pm25", // ระบุ id ที่จะนำมารวมกับ HTML
  value: 0, // ค่าเริ่มต้น
  min: 0, // ค่าต่ำสุด
  max: 100, // ค่าสูงสุด
  title: "PM2.5 (µg/m³)",
  label: "µg/m³"
});
var pm10Gauge = new JustGage({
  id: "gauge-pm10", 
  value: 0,
  min: 0,
  max: 200,
  title: "PM10 (µg/m³)",
  label: "µg/m³"
});
var tempGauge = new JustGage({
  id: "gauge-temp", 
  value: 0,
  min: -10,
  max: 50,
  title: "Temperature (°C)",
  label: "°C"
});
var humidityGauge = new JustGage({
  id: "gauge-humidity", 
  value: 0,
  min: 0,
  max: 100,
  title: "Humidity (%)",
  label: "%"
});
// ฟังก์ชันในการดึงข้อมูลจาก Firebase
function fetchLatestData() {
  const db = getDatabase(); // ใช้ฟังก์ชันจาก modular SDK
  const dataRef = ref(db, 'iot_data');

  get(dataRef).then(snapshot => {
    const data = snapshot.val();
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    if (!data) {
      tableBody.innerHTML = '<tr><td colspan="6">ไม่พบข้อมูล</td></tr>';
      return;
    }

    // 🔄 แปลงเป็น array และเลือก 5 อันสุดท้าย
    const recentData = Object.values(data)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // เรียงใหม่ตามเวลา (ใหม่ -> เก่า)
      .slice(0, 4); // เอาแค่ 5 แถวล่าสุด

    recentData.forEach(entry => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(entry.timestamp).toLocaleTimeString('th-TH')}</td>
        <td>${entry.pm25 || '--'}</td>
        <td>${entry.pm10 || '--'}</td>
        <td>${entry.temperature || '--'}</td>
        <td>${entry.humidity || '--'}</td>
        <td>${entry.pump_status || '--'}</td>
      `;
      tableBody.appendChild(row);
    });
  });
}
function loadSummaryStats() {
  const now = Date.now();
  const startTime = now - 24 * 60 * 60 * 1000; // 24 ชั่วโมงย้อนหลัง

  get(dataRef).then(snapshot => {
    const data = snapshot.val();
    const values = Object.values(data).filter(entry => {
      const ts = new Date(entry.timestamp).getTime();
      return ts >= startTime;
    });

    if (values.length === 0) return;

    // เก็บค่าทั้งหมด
    const pm25Values = values.map(v => parseFloat(v.pm25)).filter(Number.isFinite);
    const pm10Values = values.map(v => parseFloat(v.pm10)).filter(Number.isFinite);
    const tempValues = values.map(v => parseFloat(v.temperature)).filter(Number.isFinite);
    const humidityValues = values.map(v => parseFloat(v.humidity)).filter(Number.isFinite);

    // ฟังก์ชันหาค่าเฉลี่ย
    const avg = arr => (arr.reduce((sum, v) => sum + v, 0) / arr.length).toFixed(0);

    // หาค่าสูงสุดและต่ำสุด พร้อมเวลา
    const getMaxWithTime = (arr, field) => {
      const maxEntry = arr.reduce((max, cur) =>
        parseFloat(cur[field]) > parseFloat(max[field]) ? cur : max, arr[0]);
      return {
        value: parseFloat(maxEntry[field]),
        time: new Date(maxEntry.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
    };

    const getMinWithTime = (arr, field) => {
      const minEntry = arr.reduce((min, cur) =>
        parseFloat(cur[field]) < parseFloat(min[field]) ? cur : min, arr[0]);
      return {
        value: parseFloat(minEntry[field]),
        time: new Date(minEntry.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
    };

    const pm25Max = getMaxWithTime(values, 'pm25');
    const pm25Min = getMinWithTime(values, 'pm25');

    // นำข้อมูลไปแสดงใน DOM
    document.getElementById('avg-pm25').innerText = avg(pm25Values);
    document.getElementById('avg-pm10').innerText = avg(pm10Values);
    document.getElementById('avg-temp').innerText = avg(tempValues);
    document.getElementById('avg-humidity').innerText = avg(humidityValues);
    document.getElementById('max-pm25').innerHTML = `${pm25Max.value} µg/m³<br><small>(${pm25Max.time} น.)</small>`;
    document.getElementById('min-pm25').innerHTML = `${pm25Min.value} µg/m³<br><small>(${pm25Min.time} น.)</small>`;
  });
}
function countExceedances() {
  const now = Date.now();
  const startTime = now - 24 * 60 * 60 * 1000; // 24 ชั่วโมง

  get(dataRef).then(snapshot => {
    const data = snapshot.val();
    if (!data) return;

    let countPM25 = 0;
    let countPM10 = 0;

    Object.values(data).forEach(entry => {
      const ts = new Date(entry.timestamp).getTime();
      if (ts >= startTime) {
        if (parseFloat(entry.pm25) > 50) countPM25++;
        if (parseFloat(entry.pm10) > 120) countPM10++;
      }
    });

    // แสดงผล
    document.getElementById('exceed-pm25').innerText = countPM25;
    document.getElementById('exceed-pm10').innerText = countPM10;
  });
}

function downloadEngineeringPDFReport() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const margin = 15;
  let y = margin;

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH');
  const timeStr = now.toLocaleTimeString('th-TH');

  pdf.setFont("helvetica");
  pdf.setFontSize(18);
  pdf.text("รายงานวิเคราะห์คุณภาพอากาศ (Engineering Report)", 105, y, { align: "center" });
  y += 10;

  pdf.setFontSize(12);
  pdf.text(`วันที่: ${dateStr}   เวลา: ${timeStr}`, margin, y); y += 8;
  pdf.text(`สถานที่วัด: โรงงานคอนกรีต XYZ`, margin, y); y += 10;

  // 🔹 Summary
  pdf.setFontSize(14);
  pdf.text("1. ข้อมูลสรุป (Summary)", margin, y); y += 8;

  const avgPM25 = document.getElementById('avg-pm25').innerText || "--";
  const avgPM10 = document.getElementById('avg-pm10').innerText || "--";
  const avgTemp = document.getElementById('avg-temp').innerText || "--";
  const avgHumidity = document.getElementById('avg-humidity').innerText || "--";
  const maxPM25 = document.getElementById('max-pm25').innerText.replace(/<[^>]*>/g, '') || "--";
  const minPM25 = document.getElementById('min-pm25').innerText.replace(/<[^>]*>/g, '') || "--";

  pdf.setFontSize(12);
  pdf.text(`- ค่าเฉลี่ย PM2.5: ${avgPM25} µg/m³`, margin, y); y += 6;
  pdf.text(`- ค่าเฉลี่ย PM10: ${avgPM10} µg/m³`, margin, y); y += 6;
  pdf.text(`- อุณหภูมิเฉลี่ย: ${avgTemp} °C`, margin, y); y += 6;
  pdf.text(`- ความชื้นสัมพัทธ์เฉลี่ย: ${avgHumidity} %`, margin, y); y += 6;
  pdf.text(`- PM2.5 สูงสุด: ${maxPM25}`, margin, y); y += 6;
  pdf.text(`- PM2.5 ต่ำสุด: ${minPM25}`, margin, y); y += 10;

  // 🔹 กราฟแนวโน้ม
  pdf.setFontSize(14);
  pdf.text("2. กราฟแนวโน้มคุณภาพอากาศ", margin, y); y += 5;

  html2canvas(document.getElementById("historyChart")).then(canvas => {
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 180;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
    y += imgHeight + 10;

    // 🔹 หมายเหตุ / ข้อเสนอแนะ
    pdf.setFontSize(14);
    pdf.text("3. ข้อเสนอแนะเบื้องต้น", margin, y); y += 8;
    pdf.setFontSize(12);
    pdf.text("- ติดตั้งระบบแจ้งเตือนเมื่อ PM2.5 เกิน 50 µg/m³", margin, y); y += 6;
    pdf.text("- ควรเปิดระบบกรองอากาศอัตโนมัติช่วงบ่าย", margin, y); y += 6;
    pdf.text("- เพิ่มจำนวนเซนเซอร์ในจุดอับลม", margin, y); y += 10;

    // 🔚 ปิดท้าย
    pdf.setFontSize(12);
    pdf.text("รายงานนี้จัดทำเพื่อวิเคราะห์และปรับปรุงสภาพแวดล้อมโรงงานให้ปลอดภัย", margin, y);

    // 📥 Save PDF
    pdf.save(`Air_Quality_Report_${dateStr}.pdf`);
  });
}

// ✅ สำคัญ: ให้ฟังก์ชันนี้ถูกเรียกได้จาก HTML
window.downloadEngineeringPDFReport = downloadEngineeringPDFReport;


// เรียกใช้ฟังก์ชันทุกๆ 5 วินาทีเพื่ออัปเดตข้อมูล
setInterval(fetchLatestData, 5000);
// เรียกใช้ฟังก์ชันทันทีที่หน้าโหลด
window.onload = fetchLatestData;
loadSummaryStats();
countExceedances();
