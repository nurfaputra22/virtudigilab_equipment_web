// =========================
// CONFIG
// =========================
const BASE_PATH = "https://nurfaputra22.github.io/virtudigilab_equipment_web/";

// Semua lokasi → CSV berbeda
const SHEETS = {
  "22A3": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=0&single=true&output=csv",
  "27A6": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=143986787&single=true&output=csv",
  "26A2": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1522404894&single=true&output=csv"
};

// Log maintenance & calibration
const LOG_M_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1651659513&single=true&output=csv";

const LOG_C_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1319359661&single=true&output=csv";


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
      } else inside = !inside;
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
    } else current += c;
  }

  if (current !== "" || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const headers = clean[0];
  const body = clean.slice(1);

  const objects = body.map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = r[i] || ""));
    return obj;
  });

  return { headers, objects };
}

async function loadCSVParsed(url) {
  const res = await fetch(url);
  return csvToParsed(await res.text());
}

const findSerialColumnFromHeaders = (h) =>
  h.find((x) => x.toLowerCase().includes("serial")) || null;


// =========================
// LIST.HTML — LOAD ASSET LIST BY LOCATION
// =========================
async function loadListPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const location = urlParams.get("location");
  if (!location || !SHEETS[location]) return;

  const tbody = document.getElementById("list-body");
  const headerTitle = document.getElementById("headerLocation");
  headerTitle.textContent = location;

  try {
    const parsed = await loadCSVParsed(SHEETS[location]);
    const data = parsed.objects;
    const serialCol = findSerialColumnFromHeaders(parsed.headers);

    tbody.innerHTML = "";

    let no = 1;
    data.forEach((item, i) => {
      const serial = item[serialCol];
      const desc = item["Asset Description"] || item["Description"] || "-";

      const detailURL =
        BASE_PATH +
        "detail.html?serial=" +
        encodeURIComponent(serial) +
        "&location=" +
        encodeURIComponent(location);

      const row = `
        <tr>
          <td>${no++}</td>
          <td><a href="${detailURL}">${serial}</a></td>
          <td>${desc}</td>
          <td><div class="qr-${i}"></div></td>
        </tr>`;
      tbody.insertAdjacentHTML("beforeend", row);

      new QRCode(document.querySelector(`.qr-${i}`), {
        text: detailURL,
        width: 70,
        height: 70,
      });
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4">Gagal memuat data.</td></tr>`;
  }
}


// =========================
// DETAIL.HTML — LOAD DETAIL ITEM
// =========================
async function loadDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const serial = urlParams.get("serial");
  const location = urlParams.get("location");

  if (!serial || !location) return;

  const tableBody = document.getElementById("detail-body");

  const parsed = await loadCSVParsed(SHEETS[location]);
  const serialCol = findSerialColumnFromHeaders(parsed.headers);

  const item = parsed.objects.find(
    (r) => r[serialCol].trim() === serial.trim()
  );

  if (!item) {
    tableBody.innerHTML = `<tr><td colspan="2">Data tidak ditemukan</td></tr>`;
    return;
  }

  // Render semua field
  parsed.headers.forEach((key) => {
    tableBody.insertAdjacentHTML(
      "afterbegin",
      `<tr><th>${key}</th><td>${item[key] || "-"}</td></tr>`
    );
  });

  // QR Code di bawah tabel
  const finalURL =
    BASE_PATH +
    "detail.html?serial=" +
    encodeURIComponent(serial) +
    "&location=" +
    encodeURIComponent(location);

  new QRCode(document.getElementById("qrcode"), {
    text: finalURL,
    width: 180,
    height: 180,
  });

  // Load log maintenance & calibration
  loadLogs(serial);
}


// =========================
// LOAD LOGS
// =========================
async function loadLogs(serial) {
  const logM = await loadCSVParsed(LOG_M_URL);
  const logC = await loadCSVParsed(LOG_C_URL);

  const mCol = findSerialColumnFromHeaders(logM.headers);
  const cCol = findSerialColumnFromHeaders(logC.headers);

  const tableM = document.getElementById("log-maintenance");
  const tableC = document.getElementById("log-calibration");

  const mRows = logM.objects.filter((r) => r[mCol] === serial);
  const cRows = logC.objects.filter((r) => r[cCol] === serial);

  renderLog(tableM, logM.headers, mRows);
  renderLog(tableC, logC.headers, cRows);
}

function renderLog(container, headers, rows) {
  if (!rows.length) {
    container.innerHTML = "Tidak ada data";
    return;
  }

  let html = "<table><tr>";
  headers.forEach((h) => (html += `<th>${h}</th>`));
  html += "</tr>";

  rows.forEach((r) => {
    html += "<tr>";
    headers.forEach((h) => {
      if (h.toLowerCase() === "document") {
        const link = r[h]
          ? `<a href="${r[h]}" target="_blank">File</a>`
          : "-";
        html += `<td>${link}</td>`;
      } else html += `<td>${r[h] || "-"}</td>`;
    });
    html += "</tr>";
  });

  html += "</table>";
  container.innerHTML = html;
}


// =========================
// AUTO RUN
// =========================
if (document.getElementById("list-body")) loadListPage();
if (document.getElementById("detail-body")) loadDetailPage();
