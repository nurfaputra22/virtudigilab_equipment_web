// public CSV (sama seperti di detail.html)
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=0&single=true&output=csv";

// parse CSV line (handle quotes sederhana)
function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

async function loadAssets() {
  try {
    const res = await fetch(sheetUrl);
    const text = await res.text();
    const lines = text.split(/\r?\n/);

    // Format: 0 = judul sheet, 1 = kosong, 2 = header, 3 = kategori, data mulai idx 4
    if (lines.length < 5) {
      const grid = document.getElementById("assetGrid");
      grid.innerHTML = `<tr><td colspan="5" class="loading">CSV tidak sesuai format yang diharapkan.</td></tr>`;
      return;
    }

    const headerLine = lines[2];
    const headers = parseCSVLine(headerLine).map(h => h.trim());

    const dataLines = lines.slice(4);
    const rows = dataLines
      .map(l => parseCSVLine(l))
      .filter(r => r.length > 1 && r.some(cell => cell && cell.trim() !== ""));

    const grid = document.getElementById("assetGrid");
    grid.innerHTML = "";

    if (rows.length === 0) {
      grid.innerHTML = `<tr><td colspan="5" class="loading">Tidak ada data.</td></tr>`;
      return;
    }

    rows.forEach((row, i) => {
      const no = i + 1;
      // sesuai mapping header di file CSV: index 1 = Kode Material, index 2 = Asset, index 4 = Asset Description, index 5 = Location
      const kodeMaterial = (row[1] || "-").trim();
      const assetDesc = (row[4] || "-").trim();
      const location = (row[5] || "-").trim();
      const kodeAsset = (row[2] || "-").trim();

      // link ke detail menggunakan parameter id (kolom Asset)
      const detailUrl = `detail.html?id=${encodeURIComponent(kodeAsset)}`;
      const qrUrl = `https://chart.googleapis.com/chart?chs=120x120&cht=qr&chl=${encodeURIComponent(detailUrl)}`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${no}</td>
        <td><a href="${detailUrl}">${kodeMaterial}</a></td>
        <td>${assetDesc}</td>
        <td>${location}</td>
        <td><a href="${detailUrl}"><img src="${qrUrl}" alt="QR ${kodeAsset}" class="qr" /></a></td>
      `;
      grid.appendChild(tr);
    });

  } catch (err) {
    const grid = document.getElementById("assetGrid");
    grid.innerHTML = `<tr><td colspan="5" class="loading">Gagal memuat data: ${err}</td></tr>`;
  }
}

loadAssets();
