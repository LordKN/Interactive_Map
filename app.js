// Map file -> canvas id -> title
const chartsConfig = [
  { file: "2023_log.csv", canvasId: "pie2023", title: "2023 Category Mix (Total LBS)" },
  { file: "2024_log.csv", canvasId: "pie2024", title: "2024 Category Mix (Total LBS)" },
  { file: "2025_log.csv", canvasId: "pie2025", title: "2025 Category Mix (Total LBS)" },
];

const targetCounty = new Set(["ELK", "MAR", "SJ"]);

// Map CSV column names to internal keys
const columnMap = {
  proteins: "Proteins LBS",
  starch: "Starch LBS",
  veg: "Veg LBS",
  fruit: "Fruit LBS",
  baked_goods: "Baked Goods LBS",
  dairy: "Dairy LBS",
  grocery: "Grocery LBS",
  individual_meal_lbs: "Indvid Meal LBS",
};

// Convert value to number, treating empty/"NA" as 0
function toNum(v) {
  const s = String(v ?? "").trim();                             // if v is null/undefined, make it an empty string
  if (s === "" || s.toUpperCase() === "NA") return 0;           //if s is empty or "NA", return 0
  const n = Number(s);                                          // try to convert to number
  return Number.isFinite(n) ? n : 0;                            // return n if finite, else 0
}

function normCounty(v) {
  return String(v ?? "").trim().toUpperCase();                  //if county is null/undefined, make it an empty string, then trim and uppercase
}

// Basic CSV parser (OK if you don't have quoted commas)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);                     //text is the whole CSV file as a string, then trim whitespace and split into lines. Windows uses \r\n, Unix uses \n for new lines
  //lines = ["line1", "line2", ...]
  const headers = lines[0].split(",").map(h => h.trim());       // First line is headers, split by comma and trim whitespace, then headers = ["header1", "header2", ...]

  return lines.slice(1).map(line => {
    const values = line.split(",");                             // Split each subsequent line by comma into values, e.g. ["value1", "value2", ...]    
    const obj = {};                                             // Create an empty object to hold the row data
    headers.forEach((h, i) => obj[h] = (values[i] ?? "").trim());      // For each header, assign the corresponding value (or empty string if missing) to the object, trimming whitespace
    // obj = { "header1": "value1", "header2": "value2", ... }
    return obj;
  });
}

function computeCategoryTotals(rows) {
  // totals across ELK+MAR+SJ (no need to store per-county for pie)
  const totals = {};
  for (const key in columnMap) totals[key] = 0;               // Initialize totals for each category to 0

  for (const row of rows) {                                   // Iterate over each row in the CSV data
    const county = normCounty(row["County"]);                 // Normalize the county name from the "County" column
    if (!targetCounty.has(county)) continue;                  // Skip rows not in target counties

    for (const [key, colName] of Object.entries(columnMap)) { // For each category, get the corresponding column name
      totals[key] += toNum(row[colName]);                     // Add the numeric value from the row to the total for that category
    }
  }

  return totals;
}

function drawPieChart(canvasId, title, totals) {
  const ctx = document.getElementById(canvasId).getContext("2d");                                   // Get the canvas context by ID from the HTML

  const labels = Object.keys(totals).map(k => k.replaceAll("_", " ").toUpperCase());                // Create labels by replacing underscores with spaces and converting to uppercase
  const data = Object.values(totals);                                                               // Get the corresponding data values

  // Optional: hide categories that are 0 to keep the pie clean
  const filtered = labels.map((label, i) => ({ label, value: data[i] }))                            // Create array of objects with label and value
    .filter(x => x.value > 0);

  const finalLabels = filtered.map(x => x.label);
  const finalData = filtered.map(x => x.value);

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: finalLabels,
      datasets: [{ data: finalData }],
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: title },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const v = ctx.raw;
              const pct = total ? ((v / total) * 100).toFixed(1) : "0.0";
              return `${ctx.label}: ${v.toFixed(2)} lbs (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

async function loadAndRenderOne({ file, canvasId, title }) {
  const res = await fetch(file);                                         // Fetch the CSV file
  if (!res.ok) throw new Error(`Failed to load ${file}`);                // Check for successful response
  const text = await res.text();                                         // Get the response text (CSV content)

  const rows = parseCSV(text);                                           // Parse the CSV text into rows of objects
  const totals = computeCategoryTotals(rows);                            // Compute the category totals for the target counties

  console.log(file, totals);                                             // Log the totals for debugging
  drawPieChart(canvasId, title, totals);                                 // Draw the pie chart on the specified canvas
}

async function main() {
  // load all 3 files and render 3 charts
  for (const cfg of chartsConfig) {
    await loadAndRenderOne(cfg);                                         // Load and render each chart sequentially
  }
}

function initBaseMap() {
  // Center near Elkhart/Marion/SJ area
  const map = L.map('map').setView([41.68, -86.25], 9);                  // Initialize the map centered at given coordinates with zoom level 9
  //OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);
  return map;                                                            // Return the initialized map object  
}

async function addCountyBoundaries(map) {
  const res = await fetch('target_counties.geojson');               // Fetch the GeoJSON file for target counties
  if (!res.ok) throw new Error('Failed to load target_counties.geojson');
  const geojson = await res.json();                                 // Parse the response as JSON

  const layer = L.geoJSON(geojson, {                                   // Create a GeoJSON layer
    style: (feature) => ({                                           // Style function for each feature
      weight: 3,
      color: 'blue',
      fillOpacity: 0.15
    }),
    onEachFeature: (feature, layer) => {                           // Function to bind popup to each feature
      const name = feature.properties.NAME || "County";
      layer.bindPopup(`<strong>${name} County</strong>`);
    }
  }).addTo(map);

  //Zoom to fit the county boundaries
  map.fitBounds(layer.getBounds());
}

async function addTractLayer(map) {
  const res = await fetch("tracts_elk_mar_sj.geojson");
  if (!res.ok) throw new Error("Failed to load tracts_elk_mar_sj.geojson");
  const geojson = await res.json();

  console.log("Tract features:", geojson.features?.length);

  const tractLayer = L.geoJSON(geojson, {
    style: () => ({
      weight: 1,
      color: "#000000",
      fillOpacity: 0.05, // lighter fill so roads still visible
    }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};
      const name = p.NAME ?? p.NAMELSAD ?? "Tract";

      // These may not exist in your TIGER tract file (will show N/A)
      const povNum = Number(p.PovertyPct);
      const povLabel = Number.isFinite(povNum) ? `${povNum.toFixed(1)}%` : "N/A";

      const incNum = Number(p.MedianIncomeNum);
      const incLabel = Number.isFinite(incNum) ? `$${incNum.toLocaleString()}` : "N/A";

      layer.bindPopup(`
        <b>${name}</b><br>
        Poverty: ${povLabel}<br>
        Median Income: ${incLabel}
      `);
    }
  });

  return tractLayer; // return only, don't add here
}

function povertyColor(pct) {
  //Missing data
  if (!Number.isFinite(pct)) return "#cccccc";

  // Define thresholds and corresponding colors
  if (pct < 10) return "#2ca25f";       // Green for low poverty
  if (pct < 20) return "#99d8c9";      // Light green
  if (pct < 30) return "#ffffb2";      // Yellow for moderate poverty
  if (pct < 40) return "#fecc5c";      // Orange for high poverty
  return "#de2d26";                    // Red for very high poverty
}

async function buildPovertyLayer(geojsonPath = "tracts_acs_2023_elk_mar_sj.geojson") {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  console.log("Poverty tracts:", geojson.features?.length);

  const layer = L.geoJSON(geojson, {
    style: (feature) => {
      const pct = Number(feature.properties?.PovertyPct);
      return {
        color: "#ffffff",
        weight: 0.3,
        fillOpacity: 0.55,
        fillColor: povertyColor(pct),
      };
    },
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};
      const name = p.NAME ?? p.NAMELSAD ?? "Tract";

      const pct = Number(p.PovertyPct);
      const pctLabel = Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "NA";

      leafletLayer.bindPopup(`
        <b>${name}</b><br>
        Poverty: ${pctLabel}
      `);
    },
  });

  return layer;
}

function addPovertyLegend(map) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    const grades = [0, 10, 20, 30];

    div.innerHTML = `<b>Poverty %</b><br>`;
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i];
      const to = grades[i + 1];
      const color = povertyColor(from + 0.01);

      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="width:14px;height:14px;background:${color};display:inline-block;border:1px solid #999;"></span>
          ${from}${to ? `–${to}` : "+"}
        </div>
      `;
    }
    return div;
  };

  legend.addTo(map);
  return legend; // important so we can remove it later
}

document.addEventListener("DOMContentLoaded", async () => {
  const map = initBaseMap();

  // Always on
  await addCountyBoundaries(map);

  // Poverty toggle state
  let povertyLayer = null;
  let povertyLegend = null;
  let povertyOn = false;

  const btn_poverty = document.getElementById("togglePoverty");
  if (!btn_poverty) {
    console.warn('Button with id="togglePoverty" not found in HTML.');
    return;
  }

  btn_poverty.addEventListener("click", async () => {
    // Build layer only once (first click)
    if (!povertyLayer) {
      povertyLayer = await buildPovertyLayer();
    }

    if (!povertyOn) {
      povertyLayer.addTo(map);
      map.fitBounds(povertyLayer.getBounds());

      if (!povertyLegend) povertyLegend = addPovertyLegend(map);

      btn_poverty.textContent = "Hide Poverty Layer";
      povertyOn = true;
    } else {
      map.removeLayer(povertyLayer);

      if (povertyLegend) {
        map.removeControl(povertyLegend);
        povertyLegend = null;
      }

      btn_poverty.textContent = "Show Poverty Layer";
      povertyOn = false;
    }

    // Tracts toggle (show all the time)
    const tractLayer = await addTractLayer(map);
    tractLayer.addTo(map);          // show it
  });


  main().catch(err => console.error("Error in main:", err)); // Run the main function to load charts, with error handling
});