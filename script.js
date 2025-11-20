// =========================
// CONFIG
// =========================
const BASE_PATH = "https://nurfaputra22.github.io/virtudigilab_equipment_web/";

const NRC_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?output=csv";

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
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      if (csvText[i + 1] === '"') {
        current += '"';
        i++;
      } else insideQuote = !insideQuote;
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
    } else current += char;
  }

  if (current !== "" || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  const cleanRows = rows.filter((r) => r.some((c) => c && c.trim() !== ""));
  if (!cleanRows.length) return { headers: [], rows: [], objects: [] };

  const headers = cleanRows[0].map((h) => (h || "").trim());
  const dataRows = cleanRows.slice(1);

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

function makeDocumentLink(url) {
  if (!url) return "-";
  const valid =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  return `<a href="${valid}" target="_blank" rel="noopener noreferrer">Lampiran File</a>`;
}



// =========================
// INDEX.HTML + Search + Filter
// =========================
async function loadAssets() {
  const tbody = document.getElementById("assetGrid");
  const searchInput = document.getElementById("searchInput");
  const locationFilter = document.getElementById("locationFilter");

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
      headers.find((h) => h.toLowerCase().includes("description")) ||
      headers[1];

    const locationCol =
      headers.find((h) => h.toLowerCase().includes("location")) ||
      headers[2];

    // ========== Populate LOCATION dropdown ==========
    const uniqueLoc = [...new Set(data.map((d) => d[locationCol]))]
      .filter((x) => x && x.trim() !== "")
      .sort();

    uniqueLoc.forEach((loc) => {
      const opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      locationFilter.appendChild(opt);
    });

    // ========== Fungsi render tabel ==========
    function renderTable(filteredData) {
      tbody.innerHTML = "";
      let no = 1;

      filteredData.forEach((item, index) => {
        const serial = item[serialCol];
        if (!serial) return;

        const detailUrl =
          BASE_PATH + "detail.html?serial=" + encodeURIComponent(serial);

        const row = `
          <tr>
            <td>${no++}</td>
            <td><a href="${detailUrl}" target="_blank">${serial}</a></td>
            <td>${item[descCol] || ""}</td>
            <td>${item[locationCol] || ""}</td>
            <td><div class="qr-${index}"></div></td>
          </tr>
        `;

        tbody.insertAdjacentHTML("beforeend", row);

        new QRCode(document.querySelector(`.qr-${index}`), {
          text: detailUrl,
          width: 80,
          height: 80,
        });
      });
    }

    // ========== Fungsi filter ==========
    function applyFilters() {
      const keyword = searchInput.value.toLowerCase();
      const selectedLocation = locationFilter.value;

      const filtered = data.filter((item) => {
        const matchSearch =
          (item[serialCol] || "").toLowerCase().includes(keyword) ||
          (item[descCol] || "").toLowerCase().includes(keyword) ||
          (item[locationCol] || "").toLowerCase().includes(keyword);

        const matchLocation =
          selectedLocation === "" || item[locationCol] === selectedLocation;

        return matchSearch && matchLocation;
      });

      renderTable(filtered);
    }

    // Event listener
    searchInput.addEventListener("input", applyFilters);
    locationFilter.addEventListener("change", applyFilters);

    // Render awal
    renderTable(data);

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5">Gagal memuat data.</td></tr>`;
  }
}



// =========================
// DETAIL.HTML
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
  const headers = nrcParsed.headers;
  const serialCol = findSerialColumnFromHeaders(headers);

  const container = document.getElementById("data-container");

  const item = nrc.find(
    (r) => (r[serialCol] || "").trim() === serialParam.trim()
  );

  if (!item) {
    container.innerHTML = `<p>Data tidak ditemukan.</p>`;
    return;
  }

  let html = "<table>";
  let qrInserted = false;

  headers.forEach((key) => {
    html += `<tr><th>${key}</th><td>${item[key] || ""}</td></tr>`;

    if (!qrInserted && key.toLowerCase().includes("place")) {
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

  const finalDetailUrl =
    BASE_PATH + "detail.html?serial=" + encodeURIComponent(serialParam);

  const qrCell = document.getElementById("qr-code-cell");
  if (qrCell) {
    new QRCode(qrCell, {
      text: finalDetailUrl,
      width: 160,
      height: 160,
    });
  }

  // Maintenance Log
  const logMContainer = document.getElementById("log-maintenance");
  const serialColM = findSerialColumnFromHeaders(mParsed.headers);
  const matchedM = mParsed.objects.filter(
    (r) => (r[serialColM] || "").trim() === serialParam
  );

  if (!matchedM.length) {
    logMContainer.innerHTML = "Tidak ada data.";
  } else {
    let headerHtml = "<table><tr>";
    mParsed.headers.forEach((h) => (headerHtml += `<th>${h}</th>`));
    headerHtml += "</tr>";

    let bodyHtml = "";
    matchedM.forEach((obj) => {
      bodyHtml += "<tr>";
      mParsed.headers.forEach((h) => {
        if (h.toLowerCase() === "document") {
          bodyHtml += `<td>${makeDocumentLink(obj[h])}</td>`;
        } else {
          bodyHtml += `<td>${obj[h] || ""}</td>`;
        }
      });
      bodyHtml += "</tr>";
    });

    logMContainer.innerHTML = headerHtml + bodyHtml + "</table>";
  }

  // Calibration Log
  const logCContainer = document.getElementById("log-calibration");
  const serialColC = findSerialColumnFromHeaders(cParsed.headers);
  const matchedC = cParsed.objects.filter(
    (r) => (r[serialColC] || "").trim() === serialParam
  );

  if (!matchedC.length) {
    logCContainer.innerHTML = "Tidak ada data.";
  } else {
    let headerHtml = "<table><tr>";
    cParsed.headers.forEach((h) => (headerHtml += `<th>${h}</th>`));
    headerHtml += "</tr>";

    let bodyHtml = "";
    matchedC.forEach((obj) => {
      bodyHtml += "<tr>";
      cParsed.headers.forEach((h) => {
        if (h.toLowerCase() === "document") {
          bodyHtml += `<td>${makeDocumentLink(obj[h])}</td>`;
        } else {
          bodyHtml += `<td>${obj[h] || ""}</td>`;
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
