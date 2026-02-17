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

//Bus route colors
const routeColors = {
  "1 Madison / Mishawaka": "navy",
  "10 Western Avenue": "turquoise",
  "11 Southside Mishawaka": "maroon",
  "12 Rum Village": "midnightblue",
  "12/14 Rum Village / Sample": "thistle",
  "13 Corby / Town & Country": "gold",
  "14 Sample / Mayflower": "mediumpurple",
  "15A University Park Mall / Mishawaka (via Main Stree": "saddlebrown",
  "15B University Park Mall / Mishawaka (via Grape Road": "burlywood",
  "16 Blackthorn Express": "hotpink",
  "17 The Sweep": "olivedrab",
  "3A Portage": "firebrick",
  "3B Portage": "crimson",
  "4 Lincolnway West / Excel Center / Airport": "darkorange",
  "5 North Michigan / Laurel Woods": "navy",
  "6 South Michigan / Erskine Village": "red",
  "7 Notre Dame / University Park Mall": "forestgreen",
  "7A Notre Dame Midnight Express": "seagreen",
  "8 Miami / Scottsdale": "turquoise",
  "8/6 Miami / Scottsdale / South Michigan / Erskine Vi": "red",
  "9 Northside Mishawaka": "magenta"
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
      color: 'white',
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

// POVERTY (red ramp: darker = higher poverty)
function povertyColor(pct) {
  if (!Number.isFinite(pct)) return "#cccccc";
  if (pct < 10) return "#fee5d9";
  if (pct < 20) return "#fcae91";
  if (pct < 30) return "#fb6a4a";
  if (pct < 40) return "#de2d26";
  return "#a50f15";
}

// INCOME (purple ramp: darker = higher income)
function incomeColor(income) {
  if (!Number.isFinite(income)) return "#cccccc";
  if (income < 40000) return "#f2f0f7";
  if (income < 60000) return "#cbc9e2";
  if (income < 80000) return "#9e9ac8";
  if (income < 100000) return "#756bb1";
  return "#54278f";
}

// UNDER 18 (orange ramp: darker = higher under-18 %)
function u18Color(pct) {
  if (!Number.isFinite(pct)) return "#cccccc";
  if (pct < 15) return "#fff5eb";
  if (pct < 25) return "#fdd0a2";
  if (pct < 35) return "#fdae6b";
  if (pct < 45) return "#e6550d";
  return "#a63603";
}

// OVER 65 (green ramp: darker = higher 65+ %)
function over65Color(pct) {
  if (!Number.isFinite(pct)) return "#cccccc";
  if (pct < 10) return "#edf8e9";
  if (pct < 20) return "#bae4b3";
  if (pct < 30) return "#74c476";
  if (pct < 40) return "#31a354";
  return "#006d2c";
}



async function buildPovertyLayer(geojsonPath = "tracts_acs_2024_elk_mar_sj.geojson") {
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
          <span style="width:30px;height:30px;background:${color};display:inline-block;border:1px solid #999;"></span>
          ${from}${to ? `–${to}` : "+"}
        </div>
      `;
    }
    return div;
  };

  legend.addTo(map);
  return legend; // important so we can remove it later
}

async function buildIncomeLayer(geojsonPath = "tracts_acs_2024_elk_mar_sj.geojson") {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  console.log("Income tracts:", geojson.features?.length);

  const layer = L.geoJSON(geojson, {
    style: (feature) => {
      const income = Number(feature.properties?.MedianIncomeNum);
      return {
        color: "#ffffff",
        weight: 0.3,
        fillOpacity: 0.55,
        fillColor: incomeColor(income),
      };
    },
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};
      const name = p.NAME ?? p.NAMELSAD ?? "Tract";

      const income = Number(p.MedianIncomeNum);
      const incomeLabel = Number.isFinite(income)
        ? `$${Math.round(income).toLocaleString()}`
        : "NA";

      leafletLayer.bindPopup(`
        <b>${name}</b><br>
        Median Income: ${incomeLabel}
      `);
    },
  });

  return layer;
}

function addIncomeLegend(map) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    const grades = [0, 40000, 60000, 80000, 100000];

    div.innerHTML = `<b>Median Income</b><br>`;

    for (let i = 0; i < grades.length; i++) {
      const from = grades[i];
      const to = grades[i + 1];
      const color = incomeColor(from + 1);

      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="width:30px;height:30px;background:${color};display:inline-block;border:1px solid #999;"></span>
          ${from.toLocaleString()}${to ? `–${to.toLocaleString()}` : "+"}
        </div>
      `;
    }
    return div;
  };

  legend.addTo(map);
  return legend;
}

async function buildUnder18Layer(geojsonPath = "tracts_acs_2024_elk_mar_sj.geojson") {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  const layer = L.geoJSON(geojson, {
    style: (feature) => {
      const pct = Number(feature.properties?.Under_18Per);
      return {
        color: "#ffffff",
        weight: 0.3,
        fillOpacity: 0.55,
        fillColor: u18Color(pct),
      };
    },
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};
      const name = p.NAME ?? p.NAMELSAD ?? "Tract";

      const pct = Number(p.Under_18Per);
      const label = Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "NA";

      leafletLayer.bindPopup(`
        <b>${name}</b><br>
        Under 18: ${label}
      `);
    },
  });

  return layer;
}

async function buildOver65Layer(geojsonPath = "tracts_acs_2024_elk_mar_sj.geojson") {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  const layer = L.geoJSON(geojson, {
    style: (feature) => {
      const pct = Number(feature.properties?.Over_65Per);
      return {
        color: "#ffffff",
        weight: 0.3,
        fillOpacity: 0.55,
        fillColor: over65Color(pct),
      };
    },
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};
      const name = p.NAME ?? p.NAMELSAD ?? "Tract";

      const pct = Number(p.Over_65Per);
      const label = Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "NA";

      leafletLayer.bindPopup(`
        <b>${name}</b><br>
        Over 65: ${label}
      `);
    },
  });

  return layer;
}

function addU18Legend(map) {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    const grades = [0, 15, 25, 35, 45];
    div.innerHTML = `<b>Under 18 (%)</b><br>`;
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i], to = grades[i + 1];
      const color = u18Color(from + 0.01);
      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="width:30px;height:30px;background:${color};display:inline-block;border:1px solid #999;"></span>
          ${from}${to ? `–${to}` : "+"}
        </div>`;
    }
    return div;
  };
  legend.addTo(map);
  return legend;
}

function addOver65Legend(map) {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    const grades = [0, 10, 20, 30, 40];
    div.innerHTML = `<b>Over 65 (%)</b><br>`;
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i], to = grades[i + 1];
      const color = over65Color(from + 0.01);
      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="width:30px;height:30px;background:${color};display:inline-block;border:1px solid #999;"></span>
          ${from}${to ? `–${to}` : "+"}
        </div>`;
    }
    return div;
  };
  legend.addTo(map);
  return legend;
}

async function addBusRoutesLayer(map) {
  const res = await fetch("transpo_routes.geojson"); // or "data/transpo_routes.geojson"
  if (!res.ok) throw new Error("Failed to load transpo_routes.geojson");
  const geojson = await res.json();

  console.log("Bus route features:", geojson.features?.length);

  const routesLayer = L.geoJSON(geojson, {
    style: (feature) => {
      const name = feature.properties?.route_name ?? "";
      const color = routeColors[name] ?? "#555555"; // fallback gray
      return {
        color,
        weight: 3,
        opacity: 0.9
      };
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties?.route_name ?? "Route";
      layer.bindPopup(`<b>${name}</b>`);
    }
  });
  return routesLayer;
}

async function buildClientClusterLayer(geojsonPath = "CCFN_Clients.geojson") {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  console.log("Client points:", geojson.features?.length);

  const cluster = L.markerClusterGroup({
    // optional tuning
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 16
  });

  const geoLayer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => L.marker(latlng),
    onEachFeature: (feature, marker) => {
      const p = feature.properties || {};
      const name = p.name ?? "Client";

      const addr =
        p.geocoded_display ??
        [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");

      const approx =
        (p.approximate === true || String(p.approximate).toLowerCase() === "true")
          ? "<br><i>Approximate location</i>"
          : "";

      marker.bindPopup(`
        <b>${name}</b><br>
        ${addr || "No address"}${approx}
      `);
    }
  });

  cluster.addLayer(geoLayer);
  return cluster; // cluster acts like a layer
}




document.addEventListener("DOMContentLoaded", async () => {
  const map = initBaseMap();

  // Always on
  await addCountyBoundaries(map);

  // Overlay states
  let povertyLayer = null;
  let povertyLegend = null;
  let povertyOn = false;

  let incomeLayer = null;
  let incomeLegend = null;
  let incomeOn = false;

  let u18Layer = null, u18Legend = null, u18On = false;
  let over65Layer = null, over65Legend = null, over65On = false;

  let clientsLayer = null;
  let clientsOn = false;

  let routesLayer = null;
  let routesOn = false;

  // --- helper: turn everything off ---
  function turnOffAllOverlays() {
    // poverty off
    if (povertyLayer && povertyOn) {
      map.removeLayer(povertyLayer);
      povertyOn = false;

      if (povertyLegend) {
        map.removeControl(povertyLegend);
        povertyLegend = null;
      }

      const btnP = document.getElementById("togglePoverty");
      if (btnP) btnP.textContent = "Show Poverty Layer";
    }

    // routes off
    if (routesLayer && routesOn) {
      map.removeLayer(routesLayer);
      routesOn = false;

      const btnR = document.getElementById("toggleRoutes");
      if (btnR) btnR.textContent = "Show Bus Routes";
    }

    //Income off
    if (incomeLayer && incomeOn) {
      map.removeLayer(incomeLayer);
      incomeOn = false;

      if (incomeLegend) {
        map.removeControl(incomeLegend);
        incomeLegend = null;
      }

      const btnI = document.getElementById("toggleIncome");
      if (btnI) btnI.textContent = "Show Income";
    }

    // under 18 off
    if (u18Layer && u18On) {
      map.removeLayer(u18Layer);
      u18On = false;
      if (u18Legend) { map.removeControl(u18Legend); u18Legend = null; }
      const b = document.getElementById("toggleU18");
      if (b) b.textContent = "Show Under 18";
    }

    // over 65 off
    if (over65Layer && over65On) {
      map.removeLayer(over65Layer);
      over65On = false;
      if (over65Legend) { map.removeControl(over65Legend); over65Legend = null; }
      const b = document.getElementById("toggle65");
      if (b) b.textContent = "Show Over 65";
    }

    //Partners/clients off
    // clients off
    if (clientsLayer && clientsOn) {
      map.removeLayer(clientsLayer);
      clientsOn = false;
      const btnC = document.getElementById("toggleClients");
      if (btnC) btnC.textContent = "Show Client Pins";
    }

  }

  // -------- Poverty button --------
  const btn_poverty = document.getElementById("togglePoverty");
  if (!btn_poverty) {
    console.warn('Button with id="togglePoverty" not found in HTML.');
    return;
  }

  btn_poverty.addEventListener("click", async () => {
    // If poverty is currently OFF, turn others off then turn poverty ON
    if (!povertyOn) {
      turnOffAllOverlays();

      if (!povertyLayer) povertyLayer = await buildPovertyLayer();

      povertyLayer.addTo(map);
      map.fitBounds(povertyLayer.getBounds());

      if (!povertyLegend) povertyLegend = addPovertyLegend(map);

      btn_poverty.textContent = "Hide Poverty Layer";
      povertyOn = true;
      return;
    }

    // If poverty is ON, turn it OFF
    map.removeLayer(povertyLayer);
    povertyOn = false;

    if (povertyLegend) {
      map.removeControl(povertyLegend);
      povertyLegend = null;
    }

    btn_poverty.textContent = "Show Poverty Layer";
  });

  // -------- Routes button --------
  const btnRoutes = document.getElementById("toggleRoutes");
  if (!btnRoutes) {
    console.warn('Button with id="toggleRoutes" not found in HTML.');
  } else {
    btnRoutes.addEventListener("click", async () => {
      // If routes is currently OFF, turn others off then turn routes ON
      if (!routesOn) {
        turnOffAllOverlays();

        if (!routesLayer) routesLayer = await addBusRoutesLayer(map); // ✅ pass map if your function needs it
        // If your addBusRoutesLayer() does NOT take map, use:
        // if (!routesLayer) routesLayer = await addBusRoutesLayer();

        routesLayer.addTo(map);

        btnRoutes.textContent = "Hide Bus Routes";
        routesOn = true;
        return;
      }

      // If routes is ON, turn it OFF
      map.removeLayer(routesLayer);
      routesOn = false;

      btnRoutes.textContent = "Show Bus Routes";
    });
  }

  // -------- Income button --------
  const btnIncome = document.getElementById("toggleIncome");
  if (!btnIncome) {
    console.warn('Button with id="toggleIncome" not found in HTML.');
  } else {
    btnIncome.addEventListener("click", async () => {
      // If income is currently OFF, turn others off then turn income ON
      if (!incomeOn) {
        turnOffAllOverlays();

        if (!incomeLayer) incomeLayer = await buildIncomeLayer(); // uses your default geojsonPath

        incomeLayer.addTo(map);

        // Optional: fit to bounds like poverty does
        map.fitBounds(incomeLayer.getBounds());

        // Optional: legend
        if (!incomeLegend) incomeLegend = addIncomeLegend(map);

        btnIncome.textContent = "Hide Income";
        incomeOn = true;
        return;
      }

      // If income is ON, turn it OFF
      map.removeLayer(incomeLayer);
      incomeOn = false;

      // Remove legend if you used it
      if (incomeLegend) {
        map.removeControl(incomeLegend);
        incomeLegend = null;
      }

      btnIncome.textContent = "Show Income";
    });
  }

  // -------- Under 18 button --------
  const btnU18 = document.getElementById("toggleU18");
  if (btnU18) {
    btnU18.addEventListener("click", async () => {
      if (!u18On) {
        turnOffAllOverlays();
        if (!u18Layer) u18Layer = await buildUnder18Layer();
        u18Layer.addTo(map);
        map.fitBounds(u18Layer.getBounds());
        if (!u18Legend) u18Legend = addU18Legend(map);
        btnU18.textContent = "Hide Under 18";
        u18On = true;
        return;
      }
      map.removeLayer(u18Layer);
      u18On = false;
      if (u18Legend) { map.removeControl(u18Legend); u18Legend = null; }
      btnU18.textContent = "Show Under 18";
    });
  }

  // -------- Over 65 button --------
  const btn65 = document.getElementById("toggle65");
  if (btn65) {
    btn65.addEventListener("click", async () => {
      if (!over65On) {
        turnOffAllOverlays();
        if (!over65Layer) over65Layer = await buildOver65Layer();
        over65Layer.addTo(map);
        map.fitBounds(over65Layer.getBounds());
        if (!over65Legend) over65Legend = addOver65Legend(map);
        btn65.textContent = "Hide Over 65";
        over65On = true;
        return;
      }
      map.removeLayer(over65Layer);
      over65On = false;
      if (over65Legend) { map.removeControl(over65Legend); over65Legend = null; }
      btn65.textContent = "Show Over 65";
    });
  }

  // -------- Client Pins button --------
  const btnClients = document.getElementById("toggleClients");
  btnClients.addEventListener("click", async () => {
    if (!clientsOn) {
      turnOffAllOverlays(); // if you're doing "only one on at a time"

      if (!clientsLayer) clientsLayer = await buildClientClusterLayer();

      clientsLayer.addTo(map);
      // optional: zoom to clusters first time
      // map.fitBounds(clientsLayer.getBounds());

      btnClients.textContent = "Hide Partners";
      clientsOn = true;
    } else {
      map.removeLayer(clientsLayer);
      btnClients.textContent = "Show Partners";
      clientsOn = false;
    }
  });

  // Tracts toggle (show all the time)
  const tractLayer = await addTractLayer(map);
  tractLayer.addTo(map);          // show it immediately, or you could add a button to toggle like poverty/routes

  main().catch(err => console.error("Error in main:", err));
});


