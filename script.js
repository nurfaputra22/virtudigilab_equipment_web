// =========================
// CONFIG
// =========================

const BASE_PATH = "https://nurfaputra22.github.io/virtudigilab_equipment_web";

// Semua lokasi → Google Sheets CSV
const SHEETS = {
  "22A3": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=0&single=true&output=csv",
  "27A6": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=143986787&single=true&output=csv",
  "26A2": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1700186137&single=true&output=csv",
  "26A3": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=956477238&single=true&output=csv",
  "26A4": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=756843741&single=true&output=csv"
};

// Log maintenance & calibration
const LOG_M_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1651659513&single=true&output=csv";
const LOG_C_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1319359661&single=true&output=csv";


// =========================
// CSV PARSER
// =========================

function csvToParsed(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let inside = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];

    if (c === '"') {
      if (csvText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inside = !inside;
      }
    } else if (c === "," && !inside) {
      row.push(current.trim());
      current = "";
    } else if ((c === "\n" || c === "\r") && !inside) {
      if (current !== "" || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (c === "\r" && csvText[i + 1] === "\n") i++;
    } else {
      current += c;
    }
  }

  if (current !== "" || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (clean.length === 0) return { headers: [], objects: [] };

  const headers = clean[0];
  const objects = clean.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = r[i] || ""));
    return obj;
  });

  return { headers, objects };
}

async function loadCSVParsed(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal memuat CSV: " + res.status);
  return csvToParsed(await res.text());
}

const findSerialColumnFromHeaders = (headers) =>
  headers.find((x) => x.toLowerCase().includes("serial")) || null;


// =========================
// DETAIL.HTML — LOAD DETAIL ITEM
// =========================

async function loadDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const sn = String(urlParams.get("sn") || "").trim();
  const loc = urlParams.get("loc");

  if (!sn || !loc || !SHEETS[loc]) {
    const el = document.getElementById("detail-body");
    if (el) el.innerHTML = `<tr><td colspan="2">Parameter tidak valid</td></tr>`;
    return;
  }

  const tableBody = document.getElementById("detail-body");
  if (!tableBody) return;

  const parsed = await loadCSVParsed(SHEETS[loc]);
  const serialCol = findSerialColumnFromHeaders(parsed.headers);
  if (!serialCol) {
    tableBody.innerHTML = `<tr><td colspan="2">Kolom Serial tidak ditemukan pada sheet</td></tr>`;
    return;
  }

  const item = parsed.objects.find(
    (r) => String(r[serialCol]).trim() === sn
  );

  if (!item) {
    tableBody.innerHTML = `<tr><td colspan="2">Data tidak ditemukan</td></tr>`;
    return;
  }

  // kosongkan dahulu (hindari duplikat saat reload)
  tableBody.innerHTML = "";

  parsed.headers.forEach((key) => {
    tableBody.insertAdjacentHTML(
      "beforeend",
      `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(item[key] || "-")}</td></tr>`
    );
  });

  // pastikan kontainer QR bersih sebelum membuat QR baru
  const qrEl = document.getElementById("qrcode");
  if (qrEl) {
    qrEl.innerHTML = "";
    new QRCode(qrEl, {
      text: `${BASE_PATH}detail.html?sn=${encodeURIComponent(sn)}&loc=${encodeURIComponent(loc)}`,
      width: 150,
      height: 150
    });
  }

  loadLogs(sn);
}


// =========================
// LOAD LOGS
// =========================

async function loadLogs(sn) {
  const snFix = String(sn).trim();

  const logM = await loadCSVParsed(LOG_M_URL);
  const logC = await loadCSVParsed(LOG_C_URL);

  const mCol = findSerialColumnFromHeaders(logM.headers);
  const cCol = findSerialColumnFromHeaders(logC.headers);

  const tableM = document.getElementById("log-maintenance");
  const tableC = document.getElementById("log-calibration");

  if (!tableM || !tableC) return;

  const mRows = mCol ? logM.objects.filter(
    (r) => String(r[mCol]).trim() === snFix
  ) : [];

  const cRows = cCol ? logC.objects.filter(
    (r) => String(r[cCol]).trim() === snFix
  ) : [];

  renderLog(tableM, logM.headers, mRows);
  renderLog(tableC, logC.headers, cRows);
}

function renderLog(container, headers, rows) {
  if (!rows || rows.length === 0) {
    container.innerHTML = "Tidak ada data";
    return;
  }

  let html = "<table><tr>";
  headers.forEach((h) => {
    html += `<th>${escapeHtml(h)}</th>`;
  });
  html += "</tr>";

  rows.forEach((r) => {
    html += "<tr>";
    headers.forEach((h) => {
      const val = r[h] || "";
      if (h.toLowerCase() === "document") {
        const link = val ? `<a href="${escapeAttr(val)}" target="_blank">File</a>` : "-";
        html += `<td>${link}</td>`;
      } else {
        html += `<td>${escapeHtml(val || "-")}</td>`;
      }
    });
    html += "</tr>";
  });

  html += "</table>";
  container.innerHTML = html;
}


// =========================
// LIST.HTML — LOAD EQUIPMENT
// =========================

async function loadListPage() {
  const params = new URLSearchParams(window.location.search);
  const loc = params.get("loc");

  const titleEl = document.getElementById("room-title");
  const tbody = document.getElementById("equipment-body");

  if (!loc || !SHEETS[loc]) {
    if (titleEl) titleEl.textContent = "Lokasi tidak valid";
    return;
  }

  if (titleEl) titleEl.textContent = "Daftar Alat — " + loc;
  if (!tbody) return;

  const parsed = await loadCSVParsed(SHEETS[loc]);
  const serialCol = findSerialColumnFromHeaders(parsed.headers);
  if (!serialCol) {
    tbody.innerHTML = `<tr><td colspan="5">Kolom Serial tidak ditemukan pada sheet</td></tr>`;
    return;
  }

  // bersihkan tbody dulu
  tbody.innerHTML = "";

  parsed.objects.forEach((row) => {
    const serialValueRaw = row[serialCol];
    const serialValue = String(serialValueRaw || "").trim();

    // hilangkan row yang benar-benar kosong di kolom Serial Number
    if (serialValue === "") return;

    const name = row["Equipment Name"] || row["Asset Description"] || "-";
    const category = row["Category"] || "-";

    tbody.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(serialValue)}</td>
        <td>${escapeHtml(category)}</td>

        <td>
          <div class="qr" data-serial="${escapeAttr(serialValue)}" data-loc="${escapeAttr(loc)}"></div>
        </td>

        <td>
          <a href="detail.html?sn=${encodeURIComponent(serialValue)}&loc=${encodeURIComponent(loc)}" class="detail-btn">
            Detail
          </a>
        </td>
      </tr>
      `
    );
  });

  // Generate QR di daftar alat (gunakan BASE_PATH agar QR menuju URL penuh)
  // gunakan requestAnimationFrame supaya DOM sudah ter-render
  requestAnimationFrame(() => {
    document.querySelectorAll(".qr").forEach(div => {
      const sn = div.dataset.serial;
      const loc = div.dataset.loc;

      if (!sn || !loc) return;

      // kosongkan dulu (hindari duplikat)
      div.innerHTML = "";

      new QRCode(div, {
        text: `${BASE_PATH}detail.html?sn=${encodeURIComponent(sn)}&loc=${encodeURIComponent(loc)}`,
        width: 90,
        height: 90
      });
    });
  });
}


// =========================
// AUTO RUN
// =========================

if (document.getElementById("detail-body")) loadDetailPage();
if (document.getElementById("equipment-body")) loadListPage();


// ================
// Helpers
// ================
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function escapeAttr(s) {
  if (s == null) return "";
  return String(s).replaceAll('"', "&quot;");
}

