// =========================
// LOAD CSV
// =========================
async function loadCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  return Papa.parse(text, { header: true }).data;
}

// =========================
// SETTING FILE CSV PER LOKASI
// =========================
const lokasiFiles = {
  "22A3": "data/22A3.csv",
  "26A2": "data/26A2.csv",
  "26A3": "data/26A3.csv",
  "26A4": "data/26A4.csv",
  "27A6": "data/27A6.csv"
};

// LOG FILES
const logMaintenanceFile = "data/log_maintenance.csv";
const logCalibrationFile = "data/log_calibration.csv";

// =========================
// DETAIL PAGE HANDLER
// =========================
async function loadDetailPage() {
  const params = new URLSearchParams(location.search);
  const sn = params.get("sn");
  const loc = params.get("loc");

  if (!sn || !loc) return;

  const file = lokasiFiles[loc];
  if (!file) {
    document.getElementById("detail-body").innerHTML = "<tr><td>Lokasi tidak ditemukan</td></tr>";
    return;
  }

  const data = await loadCSV(file);
  const alat = data.find(row => row["Serial Number"] === sn);

  if (!alat) {
    document.getElementById("detail-body").innerHTML = "<tr><td>Data alat tidak ditemukan</td></tr>";
    return;
  }

  // ================
  // Isi Tabel Detail
  // ================
  let html = "";
  Object.keys(alat).forEach(k => {
    html += `
      <tr>
        <th>${k}</th>
        <td>${alat[k] || "-"}</td>
      </tr>`;
  });
  document.getElementById("detail-body").innerHTML = html;

  // ========================
  // LOG MAINTENANCE
  // ========================
  const logMaint = await loadCSV(logMaintenanceFile);
  const matchMaint = logMaint.filter(i => i["Serial Number"] === sn);

  if (matchMaint.length === 0) {
    document.getElementById("log-maintenance").innerHTML = "Tidak ada data";
  } else {
    let out = "<table><tr>";
    Object.keys(matchMaint[0]).forEach(k => out += `<th>${k}</th>`);
    out += "</tr>";

    matchMaint.forEach(row => {
      out += "<tr>";
      Object.values(row).forEach(v => out += `<td>${v}</td>`);
      out += "</tr>";
    });

    out += "</table>";
    document.getElementById("log-maintenance").innerHTML = out;
  }

  // ========================
  // LOG CALIBRATION
  // ========================
  const logCal = await loadCSV(logCalibrationFile);
  const matchCal = logCal.filter(i => i["Serial Number"] === sn);

  if (matchCal.length === 0) {
    document.getElementById("log-calibration").innerHTML = "Tidak ada data";
  } else {
    let out = "<table><tr>";
    Object.keys(matchCal[0]).forEach(k => out += `<th>${k}</th>`);
    out += "</tr>";

    matchCal.forEach(row => {
      out += "<tr>";
      Object.values(row).forEach(v => out += `<td>${v}</td>`);
      out += "</tr>";
    });

    out += "</table>";
    document.getElementById("log-calibration").innerHTML = out;
  }
}

// =========================
// LIST PAGE HANDLER
// =========================
async function loadListPage() {
  const params = new URLSearchParams(location.search);
  const loc = params.get("loc");

  const file = lokasiFiles[loc];
  if (!file) {
    document.getElementById("list-container").innerHTML = "Lokasi tidak ditemukan";
    return;
  }

  const data = await loadCSV(file);

  // FILTER : tampilkan hanya jika kolom Serial Number ADA dan TIDAK kosong
  const filtered = data.filter(row =>
    row["Serial Number"] !== undefined &&
    row["Serial Number"] !== null &&
    row["Serial Number"].trim() !== ""
  );

  let html = "";
  filtered.forEach(d => {
    html += `
      <a class="list-item" href="detail.html?sn=${d["Serial Number"]}&loc=${loc}">
        <strong>${d["Asset Description"] || "-"}</strong>
        <span>SN: ${d["Serial Number"]}</span>
      </a>
    `;
  });

  document.getElementById("list-container").innerHTML = html;
}

// =========================
// PAGE ROUTER
// =========================
if (location.pathname.includes("detail.html")) {
  loadDetailPage();
}
if (location.pathname.includes("list.html")) {
  loadListPage();
}
