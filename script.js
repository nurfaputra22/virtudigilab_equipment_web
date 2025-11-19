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
  return headers.find((h) => (h || "").toLowerCase().includes("serial")) || null;
}

function isAttachmentColumnName(colName) {
  if (!colName) return false;
  const n = colName.toLowerCase();
  return (
    n.includes("document") ||
    n.includes("file") ||
    n.includes("lampiran") ||
    n.includes("link") ||
    n.includes("url")
  );
}

function makeAttachmentCell(url) {
  if (!url) return "-";
  const href = url.startsWith("http") ? url : `https://${url}`;
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">Lampiran File</a>`;
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
    const descCol = headers.find((h) => (h || "").toLowerCase().includes("description")) || headers[0];
    const locationCol =
      headers.find((h) => (h || "").toLowerCase().includes("location")) || headers[2] || headers[0];

    tbody.innerHTML = "";

    data.forEach((item, index) => {
      const serial = item[serialCol] || "";
      if (!serial.trim()) return;

      const row = `
        <tr>
          <td>${index + 1}</td>
          <td>${serial}</td>
          <td>${item[descCol] || ""}</td>
          <td>${item[locationCol] || ""}</td>
          <td><a href="detail.html?serial=${encodeURIComponent(serial)}" target="_blank">Lihat</a></td>
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

  const item = nrc.find(
    (r) => (r[findSerialColumnFromHeaders(nrcHeaders)] || "").trim() === serialParam.trim()
  );

  const container = document.getElementById("data-container");

  if (!item) {
    container.innerHTML = `<p class="notfound">Data tidak ditemukan untuk Serial: ${serialParam}</p>`;
  } else {
    let html = "<table>";
    let qrInserted = false;

    for (const key of nrcHeaders) {
      if (isAttachmentColumnName(key)) continue;

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
    }

    html += "</table>";
    container.innerHTML = html;

    const qrCell = document.getElementById("qr-code-cell");
    if (qrCell) {
      new QRCode(qrCell, { text: window.location.href, width: 160, height: 160 });
    }
  }

  // ======================
  // LOG MAINTENANCE
  // ======================
  const logMContainer = document.getElementById("log-maintenance");
  const mHeaders = mParsed.headers;
  const matchedM = mParsed.objects.filter(
    (r) => (r[findSerialColumnFromHeaders(mHeaders)] || "").trim() === serialParam.trim()
  );

  if (matchedM.length === 0) {
    logMContainer.innerHTML = "Tidak ada data.";
  } else {
    let html = "<table><tr>";
    mHeaders.forEach((h) =>
      html += `<th>${isAttachmentColumnName(h) ? "Lampiran File" : h}</th>`
    );
    html += "</tr>";

    matchedM.forEach((row) => {
      html += "<tr>";
      mHeaders.forEach((h) => {
        const cell = row[h] || "";
        html += `<td>${isAttachmentColumnName(h) ? makeAttachmentCell(cell) : cell}</td>`;
      });
      html += "</tr>";
    });

    html += "</table>";
    logMContainer.innerHTML = html;
  }

  // ======================
  // LOG CALIBRATION
  // ======================
  const logCContainer = document.getElementById("log-calibration");
  const cHeaders = cParsed.headers;
  const matchedC = cParsed.objects.filter(
    (r) => (r[findSerialColumnFromHeaders(cHeaders)] || "").trim() === serialParam.trim()
  );

  if (matchedC.length === 0) {
    logCContainer.innerHTML = "Tidak ada data.";
  } else {
    let html = "<table><tr>";
    cHeaders.forEach((h) =>
      html += `<th>${isAttachmentColumnName(h) ? "Lampiran File" : h}</th>`
    );
    html += "</tr>";

    matchedC.forEach((row) => {
      html += "<tr>";
      cHeaders.forEach((h) => {
        const cell = row[h] || "";
        html += `<td>${isAttachmentColumnName(h) ? makeAttachmentCell(cell) : cell}</td>`;
      });
      html += "</tr>";
    });

    html += "</table>";
    logCContainer.innerHTML = html;
  }
}

// =========================
// RUN
// =========================
if (document.getElementById("assetGrid")) loadAssets();
if (document.getElementById("data-container")) loadDetailPage();
