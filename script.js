// PUBLIC CSV
const sheetUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=0&single=true&output=csv";

// DOMAIN FULL HARUS DIISI SESUAI HOSTING KAMU
const BASE_URL = "https://nurfaputra22.github.io/virtudigilab_equipment_web/";

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
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

    if (lines.length < 5) {
      document.getElementById("assetGrid").innerHTML =
        `<tr><td colspan="5" class="loading">CSV tidak sesuai format.</td></tr>`;
      return;
    }

    const dataLines = lines.slice(4);
    const rows = dataLines
      .map(l => parseCSVLine(l))
      .filter(r => r.length > 1 && r.some(cell => cell && cell.trim() !== ""));

    const grid = document.getElementById("assetGrid");
    grid.innerHTML = "";

    if (rows.length === 0) {
      grid.innerHTML =
        `<tr><td colspan="5" class="loading">Tidak ada data.</td></tr>`;
      return;
    }

    rows.forEach((row, i) => {
      const no = i + 1;
      const kodeMaterial = (row[1] || "-").trim();
      const assetName   = (row[2] || "-").trim();
      const assetDesc   = (row[4] || "-").trim();
      const location    = (row[5] || "-").trim();
      const serial      = (row[6] || "-").trim();

      // 🔥 URL DETAIL FULL – PENTING
      const detailUrl = `${BASE_URL}detail.html?id=${encodeURIComponent(serial)}`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${no}</td>
        <td><a href="${detailUrl}">${serial}</a></td>
        <td>${assetDesc}</td>
        <td>${location}</td>
        <td id="qr-${i}"></td>
      `;

      grid.appendChild(tr);

      // QR dengan logo
      const qr = new QRCodeStyling({
        width: 120,
        height: 120,
        type: "png",
        data: detailUrl,
        image: "https://raw.githack.com/nurfaputra22/virtudigilab_equipment_web/main/logo_virtu.png",
        dotsOptions: {
          color: "#000",
          type: "rounded"
        },
        backgroundOptions: {
          color: "#fff"
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 5,
        }
      });

      qr.append(document.getElementById(`qr-${i}`));
    });

  } catch (err) {
    document.getElementById("assetGrid").innerHTML =
      `<tr><td colspan="5" class="loading">Gagal memuat data: ${err}</td></tr>`;
  }
}

loadAssets();
