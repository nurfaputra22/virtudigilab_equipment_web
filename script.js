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
// CSV PARSER (return headers, rows, objects)
// =========================
function csvToParsed(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      insideQuote = !insideQuote;
      // handle escaped quotes ""
      if (insideQuote && csvText[i + 1] === '"') {
        current += '"';
        i++; // skip second quote
        insideQuote = !insideQuote; // toggle back
      }
    } else if (char === "," && !insideQuote) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuote) {
      // handle CRLF by skipping subsequent \n
      if (current !== "" || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
      // skip if CRLF pair
      if (char === "\r" && csvText[i + 1] === "\n") i++;
    } else {
      current += char;
    }
  }
  // push last
  if (current !== "" || row.length > 0) {
    row.push(current);
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
    n.includes("doc") ||
    n.includes("file") ||
    n.includes("lampiran") ||
    n.includes("link") ||
    n.includes("url") ||
    n.includes("sertifikat")
  );
}

function makeAttachmentCell(url) {
  if (!url) return "-";
  // ensure url has protocol
  const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">Lampiran File</a>`;
}

// =========================
// loadAssets for index.html
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
    const locationCol = headers.find((h) => (h || "").toLowerCase().includes("location")) || headers[2] || headers[0];

    tbody.innerHTML = "";

    data.forEach((item, index) => {
      const serial = item[serialCol] || "";
      if (!serial || serial.trim() === "") return;

      const row = `
        <tr>
          <td>${index + 1}</td>
          <td>${serial}</td>
          <td>${item[descCol] || ""}</td>
          <td>${item[locationCol] || ""}</td>
          <td>
            <a href="detail.html?serial=${encodeURIComponent(serial)}" target="_blank">Lihat</a>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    console.error("Error load assets:", err);
    const tbody = document.getElementById("assetGrid");
    if (tbody) tbody.innerHTML = `<tr><td colspan="5">Gagal memuat data.</td></tr>`;
  }
}

// =========================
// loadDetailPage for detail.html
// =========================
async function loadDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const serial = urlParams.get("serial");
  if (!serial) return;

  // load all three CSVs parsed
  const [nrcParsed, mParsed, cParsed] = await Promise.all([
    loadCSVParsed(NRC_URL),
    loadCSVParsed(LOG_M_URL),
    loadCSVParsed(LOG_C_URL),
  ]);

  const nrc = nrcParsed.objects;
  const nrcHeaders = nrcParsed.headers;
  const mRows = mParsed.rows; // raw rows
  const mHeaders = mParsed.headers;
  const mObjects = mParsed.objects;
  const cRows = cParsed.rows;
  const cHeaders = cParsed.headers;
  const cObjects = cParsed.objects;

  const serialCol = findSerialColumnFromHeaders(nrcHeaders);
  if (!serialCol) {
    document.getElementById("data-container").innerHTML = "<p class='notfound'>Kolom serial tidak ditemukan di NRC.</p>";
    return;
  }

  // find item
  const item = nrc.find((r) => (r[serialCol] || "").trim() === serial.trim());
  const container = document.getElementById("data-container");
  if (!item) {
    container.innerHTML = `<p class="notfound">Data tidak ditemukan untuk Serial: ${serial}</p>`;
  } else {
    // Build detail table but SKIP raw Document columns (we'll handle attachments separately in logs)
    let html = "<table>";
    let qrInserted = false;

    for (const key of nrcHeaders) {
      const val = item[key] || "";
      // hide columns that are attachment/document to avoid showing long URLs in detail table
      if (isAttachmentColumnName(key)) continue;
      html += `<tr><th>${key}</th><td>${val}</td></tr>`;

      // Insert QR code right after Place Type
      if (!qrInserted && key.toLowerCase().includes("place type")) {
        html += `
          <tr>
            <th>QR Code</th>
            <td class="qr-cell"><div id="qr-code-cell"></div></td>
          </tr>
        `;
        qrInserted = true;
      }
    }

    html += "</table>";
    container.innerHTML = html;

    // generate QR with serial
    const qrCell = document.getElementById("qr-code-cell");
    if (qrCell) {
      // use qr-code-styling or qrcodejs if available; prefer qr-code-styling if loaded
      if (window.QRCodeStyling) {
        const qr = new QRCodeStyling({
          width: 160,
          height: 160,
          data: window.location.href,
          dotsOptions: { color: "#000", type: "rounded" },
          backgroundOptions: { color: "#fff" },
        });
        qr.append(qrCell);
      } else if (window.QRCode) {
        new QRCode(qrCell, { text: window.location.href, width: 160, height: 160 });
      } else {
        qrCell.innerText = serial;
      }
    }
  }

  // ---------- Render Log Maintenance ----------
  const logMContainer = document.getElementById("log-maintenance");
  if (!mObjects || mObjects.length === 0) {
    logMContainer.innerHTML = "Tidak ada data.";
  } else {
    // Filter rows matching serial
    const matchedM = mObjects.filter((r) => (r[findSerialColumnFromHeaders(mHeaders)] || "").trim() === serial.trim());
    if (matchedM.length === 0) {
      logMContainer.innerHTML = "Tidak ada data.";
    } else {
      // Build header row: map Document-like headers -> "Lampiran File"
      let headerHtml = "<table><tr>";
      for (const h of mHeaders) {
        if (isAttachmentColumnName(h)) headerHtml += `<th>Lampiran File</th>`;
        else headerHtml += `<th>${h}</th>`;
      }
      headerHtml += "</tr>";

      // Build body
      let bodyHtml = "";
      matchedM.forEach((rowObj) => {
        bodyHtml += "<tr>";
        for (let i = 0; i < mHeaders.length; i++) {
          const h = mHeaders[i];
          const cellVal = rowObj[h] || "";
          if (isAttachmentColumnName(h)) {
            bodyHtml += `<td>${cellVal ? makeAttachmentCell(cellVal) : "-"}</td>`;
          } else {
            bodyHtml += `<td>${cellVal}</td>`;
          }
        }
        bodyHtml += "</tr>";
      });

      headerHtml += bodyHtml + "</table>";
      logMContainer.innerHTML = headerHtml;
    }
  }

  // ---------- Render Log Calibration ----------
  const logCContainer = document.getElementById("log-calibration");
  if (!cObjects || cObjects.length === 0) {
    logCContainer.innerHTML = "Tidak ada data.";
  } else {
    const matchedC = cObjects.filter((r) => (r[findSerialColumnFromHeaders(cHeaders)] || "").trim() === serial.trim());
    if (matchedC.length === 0) {
      logCContainer.innerHTML = "Tidak ada data.";
    } else {
      let headerHtml = "<table><tr>";
      for (const h of cHeaders) {
        if (isAttachmentColumnName(h)) headerHtml += `<th>Lampiran File</th>`;
        else headerHtml += `<th>${h}</th>`;
      }
      headerHtml += "</tr>";

      let bodyHtml = "";
      matchedC.forEach((rowObj) => {
        bodyHtml += "<tr>";
        for (let i = 0; i < cHeaders.length; i++) {
          const h = cHeaders[i];
          const cellVal = rowObj[h] || "";
          if (isAttachmentColumnName(h)) {
            bodyHtml += `<td>${cellVal ? makeAttachmentCell(cellVal) : "-"}</td>`;
          } else {
            bodyHtml += `<td>${cellVal}</td>`;
          }
        }
        bodyHtml += "</tr>";
      });

      headerHtml += bodyHtml + "</table>";
      logCContainer.innerHTML = headerHtml;
    }
  }
}

// run appropriate parts
if (document.getElementById("assetGrid")) {
  // we're on index.html
  loadAssets();
}

if (window.location.pathname.includes("detail.html") || document.getElementById("data-container")) {
  loadDetailPage();
}
