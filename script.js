// =========================
// CONFIG
// =========================
const BASE_PATH = "https://nurfaputra22.github.io/virtudigilab_equipment_web/";

// Semua lokasi → CSV berbeda
const SHEETS = {
  "22A3":
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=0&single=true&output=csv",
  "27A6":
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=143986787&single=true&output=csv",
  "26A2":
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1700186137&single=true&output=csv",
  "26A3":
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=956477238&single=true&output=csv",
  "26A4":
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=756843741&single=true&output=csv"
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
// DETAIL.HTML — LOAD DETAIL ITEM
// =========================
async function loadDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const sn = String(urlParams.get("sn") || "").trim();
  const loc = urlParams.get("loc");

  if (!sn || !loc || !SHEETS[loc]) {
    document.getElementById("detail-body").innerHTML =
      `<tr><td colspan="2">Parameter tidak valid</td></tr>`;
    return;
  }

  const tableBody = document.getElementById("detail-body");

  const parsed = await loadCSVParsed(SHEETS[loc]);
  const serialCol = findSerialColumnFromHeaders(parsed.headers);

  const item = parsed.objects.find(
    (r) => String(r[serialCol]).trim() === sn
  );

  if (!item) {
    tableBody.innerHTML = `<tr><td colspan="2">Data tidak ditemukan</td></tr>`;
    return;
  }

  parsed.headers.forEach((key) => {
    tableBody.insertAdjacentHTML(
      "beforeend",
      `<tr><th>${key}</th><td>${item[key] || "-"}</td></tr>`
    );
  });

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

  const mRows = logM.objects.filter(
    (r) => String(r[mCol]).trim() === snFix
  );

  const cRows = logC.objects.filter(
    (r) => String(r[cCol]).trim() === snFix
  );

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
// LIST.HTML — LOAD EQUIPMENT
// =========================
async function loadListPage() {
  const params = new URLSearchParams(window.location.search);
  const loc = params.get("location");

  const titleEl = document.getElementById("room-title");
  const tbody = document.getElementById("equipment-body");

  if (!loc || !SHEETS[loc]) {
    if (titleEl) titleEl.textContent = "Lokasi tidak valid";
    return;
  }

  if (titleEl) titleEl.textContent = "Daftar Alat — " + loc;

  const parsed = await loadCSVParsed(SHEETS[loc]);
  const serialCol = findSerialColumnFromHeaders(parsed.headers);

  parsed.objects.forEach((row) => {
    let serialValue = String(row[serialCol] || "").trim();

    // RULE FINAL:
    // ❌ kosong → tidak tampil
    // ✔ ada isinya → tampil (termasuk "-")
    if (serialValue === "") return;

    tbody.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td>${row["Equipment Name"] || "-"}</td>
        <td>${serialValue}</td>
        <td>${row["Category"] || "-"}</td>
        <td>
          <a href="detail.html?sn=${serialValue}&loc=${loc}" class="detail-btn">
            Detail
          </a>
        </td>
      </tr>
      `
    );
  });
}


// =========================
// AUTO RUN
// =========================
if (document.getElementById("detail-body")) loadDetailPage();
if (document.getElementById("equipment-body")) loadListPage();



