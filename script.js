// =========================
//   CONFIG
// =========================
const NRC_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?output=csv";

// =========================
//   PARSER CSV KUAT
// =========================
function csvToJson(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuote = false;

  for (let char of csvText) {
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === "," && !insideQuote) {
      row.push(current.trim());
      current = "";
    } else if (char === "\n" && !insideQuote) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current) row.push(current.trim());
  if (row.length) rows.push(row);

  const headers = rows[0];
  const json = [];

  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    headers.forEach((h, j) => {
      obj[h.trim()] = rows[i][j] ? rows[i][j] : "";
    });
    json.push(obj);
  }

  return json;
}

async function loadCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  return csvToJson(text);
}

// =========================
//  Temukan nama kolom Serial
// =========================
function findSerialColumn(obj) {
  const keys = Object.keys(obj);
  const match = keys.find((k) => k.toLowerCase().includes("serial"));
  return match || null;
}

// =========================
//   LOAD LIST ASSET
// =========================
async function loadAssets() {
  const tbody = document.getElementById("assetGrid");

  try {
    const data = await loadCSV(NRC_URL);

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">Tidak ada data.</td></tr>`;
      return;
    }

    const serialCol = findSerialColumn(data[0]);
    const descCol =
      Object.keys(data[0]).find((k) =>
        k.toLowerCase().includes("description")
      ) || Object.keys(data[0])[0];
    const locationCol =
      Object.keys(data[0]).find((k) =>
        k.toLowerCase().includes("location")
      ) || Object.keys(data[0])[2];

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
    tbody.innerHTML = `<tr><td colspan="5">Gagal memuat data.</td></tr>`;
  }
}

loadAssets();
