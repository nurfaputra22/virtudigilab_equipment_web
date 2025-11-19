// =========================
// CONFIG
// =========================
const NRC_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?output=csv";

const LOG_M_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1651659513&single=true&output=csv";

const LOG_C_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=1319359661&single=true&output=csv";


// =========================
// CSV PARSER (robust)
// =========================
function csvToParsed(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      if (csvText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuote) {
      if (current !== "" || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (char === "\r" && csvText[i + 1] === "\n") i++;
    } else {
      current += char;
    }
  }

  if (current !== "" || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  if (!rows.length) return { headers: [], rows: [], objects: [] };

  const headers = rows[0].map((h) => (h || "").trim());
  const dataRows = rows.slice(1);

  const objects = dataRows.map((r) => {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (r[j] || "").trim();
    }
    return obj;
  });

  return { headers, rows: dataRows, objects };
}

async function loadCSVParsed(url) {
  const res = await fetch(url);
  const txt = await res.text();
  return csvToParsed(txt);
}


// =========================
// Helpers
// =========================
function findSerialColumnFromHeaders(headers) {
  return (
    headers.find((h) => (h || "").toLowerCase().includes("serial")) || null
  );
}

function makeDocumentLink(url) {
  if (!url) return "-";
  const valid =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  return `<a href="${valid}" target="_blank" rel="noopener noreferrer">Document</a>`;
}


// =========================
// index.html: loadAssets
// =========================
async function loadAssets() {
  const tbody = document.getElementById("assetGrid");
  if (!tbody) return;

  try {
    const parsed = await loadCSVParsed(NRC_URL);
    const data = parsed.objects;
    const headers = parsed.headers;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">Tidak ada data.</td></tr>`;
      return;
    }

    const serialCol = findSerialColumnFromHeaders(headers);
    const descCol =
      headers.find((h) => (h || "").toLowerCase().includes("description")) ||
      headers[0];
    const locationCol =
      headers.find((h) => (h || "").toLowerCase().includes("location")) ||
      headers[2] ||
      headers[0];

    tbody.innerHTML = "";

    data.forEach((item, index) => {
      const serial = item[serialCol] || "";
      if (!serial) return;

      const row = `
        <tr>
          <td>${index + 1}</td>
          <td>${serial}</td>
          <td>${item[descCol] || ""}</td>
          <td>${item[locationCol] || ""}</td>
          <td><a href="detail.html?serial=${encodeURIComponent(
            serial
          )}" target="_blank">Lihat</a></td>
        </tr>
      `;

      tbody.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Gagal memuat data.</td></tr>`;
  }
}


// =========================
// detail.html: loadDetailPage
// =========================
async function loadDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const serialParam = urlParams.get("serial");
  if (!serialParam) return;

  const [nrcParsed, mParsed, cParsed] = await Promise.all([
    loadCSVParsed(NRC_URL),
    loadCSVParsed(LOG_M_URL),
    loadCSVParsed(LOG_C_URL),
  ]);

  const nrc = nrcParsed.objects;
  const nrcHeaders = nrcParsed.headers;

  const mHeaders = mParsed.headers;
  const mObjects = mParsed.objects;

  const cHeaders = cParsed.headers;
  const cObjects = cParsed.objects;

  const serialCol = findSerialColumnFromHeaders(nrcHeaders);
  const container = document.getElementById("data-container");

  const item = nrc.find(
    (r) => (r[serialCol] || "").trim() === serialParam.trim()
  );

  if (!item) {
    container.innerHTML = `<p class="notfound">Data tidak ditemukan.</p>`;
    return;
  }

  // Build detail table
  let html = "<table>";
  let qrInserted = false;

  nrcHeaders.forEach((key) => {
    const val = item[key] || "";

    html += `<tr><th>${key}</th><td>${val}</td></tr>`;

    if (!qrInserted && key.toLowerCase().includes("place type")) {
      html += `
        <tr>
          <th>QR Code</th>
          <td><div id="qr-code-cell"></div></td>
        </tr>`;
      qrInserted = true;
    }
  });

  html += "</table>";
  container.innerHTML = html;

  // QR generation
  const qrCell = document.getElementById("qr-code-cell");
  if (qrCell) {
    new QRCode(qrCell, { text: window.location.href, width: 160, height: 160 });
  }

  // ===========================
  // LOG MAINTENANCE
  // ===========================
  const logMContainer = document.getElementById("log-maintenance");
  const serialColM = findSerialColumnFromHeaders(mHeaders);
  const matchedM = mObjects.filter(
    (r) => (r[serialColM] || "").trim() === serialParam
  );

  if (matchedM.length === 0) {
    logMContainer.innerHTML = "Tidak ada data.";
  } else {
    let headerHtml = "<table><tr>";
    mHeaders.forEach((h) => {
      headerHtml += `<th>${h}</th>`;
    });
    headerHtml += "</tr>";

    let bodyHtml = "";
    matchedM.forEach((rowObj) => {
      bodyHtml += "<tr>";
      mHeaders.forEach((h) => {
        if (h.toLowerCase() === "document") {
          bodyHtml += `<td>${makeDocumentLink(rowObj[h])}</td>`;
        } else {
          bodyHtml += `<td>${rowObj[h] || ""}</td>`;
        }
      });
      bodyHtml += "</tr>";
    });

    logMContainer.innerHTML = headerHtml + bodyHtml + "</table>";
  }

  // ===========================
  // LOG CALIBRATION
  // ===========================
  const logCContainer = document.getElementById("log-calibration");
  const serialColC = findSerialColumnFromHeaders(cHeaders);
  const matchedC = cObjects.filter(
    (r) => (r[serialColC] || "").trim() === serialParam
  );

  if (matchedC.length === 0) {
    logCContainer.innerHTML = "Tidak ada data.";
  } else {
    let headerHtml = "<table><tr>";
    cHeaders.forEach((h) => {
      headerHtml += `<th>${h}</th>`;
    });
    headerHtml += "</tr>";

    let bodyHtml = "";
    matchedC.forEach((rowObj) => {
      bodyHtml += "<tr>";
      cHeaders.forEach((h) => {
        if (h.toLowerCase() === "document") {
          bodyHtml += `<td>${makeDocumentLink(rowObj[h])}</td>`;
        } else {
          bodyHtml += `<td>${rowObj[h] || ""}</td>`;
        }
      });
      bodyHtml += "</tr>";
    });

    logCContainer.innerHTML = headerHtml + bodyHtml + "</table>";
  }
}


// =========================
// RUN
// =========================
if (document.getElementById("assetGrid")) loadAssets();
if (document.getElementById("data-container")) loadDetailPage();
