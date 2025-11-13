const sheetUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfYx0A9EbttwdEODklcJe0pY3TGftGwwiqvqQswVczPXNPG3CS3Am7dYNXQVa_XSoJX3Pnd_B3AQI/pub?gid=0&single=true&output=csv";

async function loadAssets() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));
  const headers = rows[0];
  const data = rows.slice(1).filter(r => r[0].trim() !== "");

  const grid = document.getElementById("assetGrid");
  grid.innerHTML = "";

  data.forEach((row, i) => {
    const no = i + 1;
    const kodeMaterial = row[1] || "-";
    const assetDesc = row[4] || "-";
    const location = row[5] || "-";
    const kodeAsset = row[2] || "-";

    // QR code link (pakai API chart Google biar cepat)
    const detailUrl = `detail.html?kode=${encodeURIComponent(kodeAsset)}`;
    const qrUrl = `https://chart.googleapis.com/chart?chs=120x120&cht=qr&chl=${encodeURIComponent(detailUrl)}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${no}</td>
      <td><a href="${detailUrl}">${kodeMaterial}</a></td>
      <td>${assetDesc}</td>
      <td>${location}</td>
      <td><img src="${qrUrl}" alt="QR ${kodeAsset}" class="qr" /></td>
    `;
    grid.appendChild(tr);
  });
}

loadAssets();

