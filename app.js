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

function initBaseMap() {
  // 1) Create map (zoom control stays top-left by default)
  const map = L.map("map", { zoomControl: true }).setView([41.68, -86.25], 9);

  // 2) Define light + dark basemaps
  const lightTiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  });

  const darkTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    maxZoom: 19
  });

  // 3) Add light by default
  lightTiles.addTo(map);

  // 4) Toggle function
  function setMapTheme(isDark) {
    if (isDark) {
      if (map.hasLayer(lightTiles)) map.removeLayer(lightTiles);
      if (!map.hasLayer(darkTiles)) darkTiles.addTo(map);
    } else {
      if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
      if (!map.hasLayer(lightTiles)) lightTiles.addTo(map);
    }
  }

  // 5) Add dark toggle control top-right
  const DarkModeControl = L.Control.extend({
    options: { position: "topright" },

    onAdd: function () {
      const container = L.DomUtil.create("div", "leaflet-bar");
      const btn = L.DomUtil.create("a", "dark-toggle-btn", container);

      btn.href = "#";
      btn.title = "Toggle Dark Map";
      btn.innerHTML = "🌙";

      // stop clicks from panning/zooming the map
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      let isDark = false;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        isDark = !isDark;
        setMapTheme(isDark);
        btn.classList.toggle("active", isDark);

        document.body.classList.toggle("dark-map-ui", isDark);
      });

      return container;
    }
  });

  map.addControl(new DarkModeControl());

  return map;
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

async function addTractLayer(map, geojsonPath = "tracts_acs_2024_elk_mar_sj.geojson") {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  console.log("Tract features:", geojson.features?.length);

  const tractLayer = L.geoJSON(geojson, {
    style: () => ({
      weight: 1,
      color: "#000000",
      fillOpacity: 0.05,
    }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};
      const name = p.NAME ?? p.NAMELSAD ?? "Tract";

      // Poverty %
      const pov = Number(p.PovertyPct);
      const povLabel = Number.isFinite(pov) ? `${pov.toFixed(1)}%` : "NA";

      // Median Income
      const inc = Number(p.MedianIncomeNum);
      const incLabel = Number.isFinite(inc)
        ? `$${Math.round(inc).toLocaleString()}`
        : "NA";

      // Under 18 %
      const u18 = Number(p.Under_18Per);
      const u18Label = Number.isFinite(u18) ? `${u18.toFixed(1)}%` : "NA";

      // Over 65 %
      const o65 = Number(p.Over_65Per);
      const o65Label = Number.isFinite(o65) ? `${o65.toFixed(1)}%` : "NA";

      // --- Census Reporter Link ---
      const geoid = p.GEOID; // adjust if your field name is different
      const censusLink = geoid
        ? `https://censusreporter.org/profiles/14000US${geoid}/`
        : null;

      layer.bindPopup(`
    <b>${name}</b><br>
    Poverty: ${povLabel}<br>
    Median Income: ${incLabel}<br>
    Under 18: ${u18Label}<br>
    Over 65: ${o65Label}<br><br>
    ${censusLink
          ? `<a href="${censusLink}" target="_blank">View on Census Reporter</a>`
          : "Census Reporter: NA"
        }
  `);
    },
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

// FOOD INSECURITY INDEX (1–10, red-orange ramp: darker = more food insecure)
function foodInsecurityColor(idx) {
  if (!Number.isFinite(idx)) return "#cccccc";
  if (idx <= 2) return "#fff5f0";
  if (idx <= 4) return "#fcbba1";
  if (idx <= 6) return "#fb6a4a";
  if (idx <= 8) return "#cb181d";
  return "#67000d";
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

async function buildFoodInsecurityLayer(geojsonPath = "tracts_acs_2024_elk_mar_sj.geojson") {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  const layer = L.geoJSON(geojson, {
    style: (feature) => {
      const idx = Number(feature.properties?.FoodInsecurityIndex);
      return {
        color: "#ffffff",
        weight: 0.3,
        fillOpacity: 0.65,
        fillColor: foodInsecurityColor(idx),
      };
    },
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};
      const name = p.NAME ?? p.NAMELSAD ?? "Tract";
      const idx = p.FoodInsecurityIndex;
      const idxLabel = idx != null ? `${idx} / 10` : "No data";
      const geoid = p.GEOID;
      const censusLink = geoid
        ? `<a href="https://censusreporter.org/profiles/14000US${geoid}/" target="_blank">View on Census Reporter</a>`
        : "";
      leafletLayer.bindPopup(`
        <b>${name}</b><br>
        Food Insecurity Index: <b>${idxLabel}</b><br>
        <span style="font-size:11px;color:#555;">(1 = least insecure, 10 = most insecure)</span><br><br>
        ${censusLink}
      `);
    },
  });

  return layer;
}

function addFoodInsecurityLegend(map) {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `<b>Food Insecurity Index</b><br>`;
    const bands = [
      { label: "1–2", color: foodInsecurityColor(1) },
      { label: "3–4", color: foodInsecurityColor(3) },
      { label: "5–6", color: foodInsecurityColor(5) },
      { label: "7–8", color: foodInsecurityColor(7) },
      { label: "9–10", color: foodInsecurityColor(9) },
    ];
    bands.forEach(b => {
      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="width:30px;height:30px;background:${b.color};display:inline-block;border:1px solid #999;"></span>
          ${b.label}
        </div>`;
    });
    div.innerHTML += `<div style="font-size:10px;color:#888;margin-top:4px;">1 = least · 10 = most insecure</div>`;
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
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 16
  });

  const geoLayer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => L.marker(latlng),
    onEachFeature: (feature, marker) => {
      const p = feature.properties || {};
      const name = p.name ?? "Partner";

      const addr =
        p.geocoded_display ??
        [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");

      const orgType = p.org_type ? `<br><span style="color:#555;font-size:12px;">${p.org_type}</span>` : "";
      const county = p.county ? `<br><span style="color:#888;font-size:11px;">County: ${p.county}</span>` : "";

      const approx =
        (p.approximate === true || String(p.approximate).toLowerCase() === "true")
          ? "<br><i style='font-size:11px;'>Approximate location</i>"
          : "";

      marker.bindPopup(`
        <b>${name}</b>${orgType}${county}<br>
        <span style="font-size:12px;">${addr || "No address"}</span>${approx}
      `);
    }
  });

  cluster.addLayer(geoLayer);
  return cluster;
}

// CFR Headquarters marker (Cultivate Food Rescue main base)
// Address: 1345 W Mishawaka Ave, South Bend, IN 46615
const CFR_HQ = { lat: 41.659479, lon: -86.265593 };

function addCFRHeadquarters(map) {
  // Custom large star/home icon for HQ
  const hqIcon = L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 15px;
          height: 15px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #16a34a, 0 2px 6px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          line-height: 1;
        ">🌱</div>
        <div style="
          position: absolute;
          top: 17px;
          left: 50%;
          transform: translateX(-50%);
          background: #15803d;
          color: white;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.3px;
          white-space: nowrap;
          padding: 1px 4px;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        ">CFR HQ</div>
      </div>
    `,
    iconSize: [15, 26],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });

  const hqMarker = L.marker([CFR_HQ.lat, CFR_HQ.lon], { icon: hqIcon, zIndexOffset: 1000 });
  hqMarker.bindPopup(`
    <div style="text-align:center;">
      <div style="font-size:22px;margin-bottom:4px;">🌱</div>
      <b style="font-size:14px;">Cultivate Food Rescue</b><br>
      <span style="color:#16a34a;font-weight:700;font-size:12px;">Main Base of Operations</span><br>
      <span style="font-size:12px;color:#555;">1345 W. Mishawaka Ave<br>South Bend, IN 46615</span>
    </div>
  `);
  hqMarker.addTo(map);
  return hqMarker;
}

function pickFirstNumber(obj, keys) {
  for (const k of keys) {
    const v = Number(obj?.[k]);
    if (Number.isFinite(v)) return { key: k, value: v };
  }
  return { key: null, value: NaN };
}

function addWalkLegend(map) {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <b>Walking Coverage</b><br>
      <div style="display:flex;align-items:center;gap:8px;margin:6px 0;">
        <span style="width:30px;height:18px;background:#3b82f6;opacity:0.5;display:inline-block;border:2px solid #1d4ed8;border-radius:3px;"></span>
        Coverage Zone
      </div>`;
    return div;
  };
  legend.addTo(map);
  return legend;
}

function walkColor(x) {
  // Expect either 0..1 or 0..100; normalize to 0..100 for bins
  if (!Number.isFinite(x)) return "#999999";
  const pct = x <= 1 ? x * 100 : x;

  if (pct >= 80) return "#1a9850";
  if (pct >= 60) return "#66bd63";
  if (pct >= 40) return "#a6d96a";
  if (pct >= 20) return "#fdae61";
  return "#d73027";
}

async function buildWalkingCoverageLayer(
  geojsonPath = "walking-coverage-merged.geojson"
) {
  const res = await fetch(geojsonPath);
  if (!res.ok) throw new Error(`Failed to load ${geojsonPath}`);
  const geojson = await res.json();

  const layer = L.geoJSON(geojson, {
    style: () => ({
      color: "#1d4ed8",
      weight: 2,
      opacity: 0.8,
      fillColor: "#3b82f6",
      fillOpacity: 0.25,
    }),
    onEachFeature: (feature, leafletLayer) => {
      leafletLayer.bindPopup(`
        <b>Walking Coverage Zone</b><br>
        <span style="font-size:12px;color:#555;">Area within walking distance<br>of a partner location</span>
      `);
    },
  });

  return layer;
}

document.addEventListener("DOMContentLoaded", async () => {
  const map = initBaseMap();

  // Always on (wrapped so a fetch error never blocks the rest of the map)
  try { await addCountyBoundaries(map); } catch (e) { console.warn("County boundaries failed to load:", e); }

  // CFR Headquarters — always visible, no fetch dependency
  addCFRHeadquarters(map);

  // Overlay states
  let povertyLayer = null;
  let povertyLegend = null;
  let povertyOn = false;

  let incomeLayer = null;
  let incomeLegend = null;
  let incomeOn = false;

  let u18Layer = null, u18Legend = null, u18On = false;
  let over65Layer = null, over65Legend = null, over65On = false;
  let foodLayer = null, foodLegend = null, foodOn = false;

  let clientsLayer = null;
  let clientsOn = false;

  let routesLayer = null;
  let routesOn = false;

  let walkLayer = null;
  let walkLegend = null;
  let walkOn = false;

  // --- helper: turn everything off ---
  function turnOffAllOverlays() {
    if (povertyLayer && povertyOn) {
      map.removeLayer(povertyLayer);
      povertyOn = false;
      if (povertyLegend) {
        map.removeControl(povertyLegend);
        povertyLegend = null;
      }
      setButtonOff(document.getElementById("togglePoverty"), "Show Poverty");
    }

    if (routesLayer && routesOn) {
      map.removeLayer(routesLayer);
      routesOn = false;
      setButtonOff(document.getElementById("toggleRoutes"), "Show Bus Routes");
    }

    if (incomeLayer && incomeOn) {
      map.removeLayer(incomeLayer);
      incomeOn = false;
      if (incomeLegend) {
        map.removeControl(incomeLegend);
        incomeLegend = null;
      }
      setButtonOff(document.getElementById("toggleIncome"), "Show Income");
    }

    if (u18Layer && u18On) {
      map.removeLayer(u18Layer);
      u18On = false;
      if (u18Legend) {
        map.removeControl(u18Legend);
        u18Legend = null;
      }
      setButtonOff(document.getElementById("toggleU18"), "Show Under 18");
    }

    if (over65Layer && over65On) {
      map.removeLayer(over65Layer);
      over65On = false;
      if (over65Legend) {
        map.removeControl(over65Legend);
        over65Legend = null;
      }
      setButtonOff(document.getElementById("toggle65"), "Show Over 65");
    }

    if (clientsLayer && clientsOn) {
      map.removeLayer(clientsLayer);
      clientsOn = false;
      setButtonOff(document.getElementById("toggleClients"), "Show Partners");
    }

    if (walkLayer && walkOn) {
      map.removeLayer(walkLayer);
      walkOn = false;
      if (walkLegend) {
        map.removeControl(walkLegend);
        walkLegend = null;
      }
      setButtonOff(document.getElementById("toggleWalk"), "Show Walking Coverage");
    }

    if (foodLayer && foodOn) {
      map.removeLayer(foodLayer);
      foodOn = false;
      if (foodLegend) {
        map.removeControl(foodLegend);
        foodLegend = null;
      }
      setButtonOff(document.getElementById("toggleFood"), "Show Food Insecurity");
    }
  }

  // --- helper: turn off selected overlay
  function turnOffSelectedOverlays() {
    if (povertyLayer && povertyOn) {
      map.removeLayer(povertyLayer);
      povertyOn = false;
      if (povertyLegend) {
        map.removeControl(povertyLegend);
        povertyLegend = null;
      }
      setButtonOff(document.getElementById("togglePoverty"), "Show Poverty");
    }

    if (routesLayer && routesOn) {
      map.removeLayer(routesLayer);
      routesOn = false;
      setButtonOff(document.getElementById("toggleRoutes"), "Show Bus Routes");
    }

    if (incomeLayer && incomeOn) {
      map.removeLayer(incomeLayer);
      incomeOn = false;
      if (incomeLegend) {
        map.removeControl(incomeLegend);
        incomeLegend = null;
      }
      setButtonOff(document.getElementById("toggleIncome"), "Show Income");
    }

    if (u18Layer && u18On) {
      map.removeLayer(u18Layer);
      u18On = false;
      if (u18Legend) {
        map.removeControl(u18Legend);
        u18Legend = null;
      }
      setButtonOff(document.getElementById("toggleU18"), "Show Under 18");
    }

    if (over65Layer && over65On) {
      map.removeLayer(over65Layer);
      over65On = false;
      if (over65Legend) {
        map.removeControl(over65Legend);
        over65Legend = null;
      }
      setButtonOff(document.getElementById("toggle65"), "Show Over 65");
    }

    if (clientsLayer && clientsOn) {
      map.removeLayer(clientsLayer);
      clientsOn = false;
      setButtonOff(document.getElementById("toggleClients"), "Show Partners");
    }
  }


  // small helpers for button UI
  function setButtonOn(button, hideText) {
    if (!button) return;
    button.textContent = hideText;
    button.classList.add("active");
  }

  function setButtonOff(button, showText) {
    if (!button) return;
    button.textContent = showText;
    button.classList.remove("active");
  }

  // -------- Poverty button --------
  const btn_poverty = document.getElementById("togglePoverty");
  if (!btn_poverty) {
    console.warn('Button with id="togglePoverty" not found in HTML.');
    return;
  }

  btn_poverty.addEventListener("click", async () => {
    if (!povertyOn) {
      if (foodOn || walkOn) {
        turnOffSelectedOverlays();
      } else {
        turnOffAllOverlays();
      }

      if (!povertyLayer) povertyLayer = await buildPovertyLayer();

      povertyLayer.addTo(map);
      map.fitBounds(povertyLayer.getBounds());

      if (!povertyLegend) povertyLegend = addPovertyLegend(map);

      setButtonOn(btn_poverty, "Hide Poverty");
      povertyOn = true;
      return;
    }

    map.removeLayer(povertyLayer);
    povertyOn = false;

    if (povertyLegend) {
      map.removeControl(povertyLegend);
      povertyLegend = null;
    }

    setButtonOff(btn_poverty, "Show Poverty");
  });

  // -------- Routes button --------
  const btnRoutes = document.getElementById("toggleRoutes");
  if (!btnRoutes) {
    console.warn('Button with id="toggleRoutes" not found in HTML.');
  } else {
    btnRoutes.addEventListener("click", async () => {
      if (!routesOn) {
        if (foodOn || walkOn) {
          turnOffSelectedOverlays();
        } else {
          turnOffAllOverlays();
        }

        if (!routesLayer) routesLayer = await addBusRoutesLayer(map);

        routesLayer.addTo(map);

        setButtonOn(btnRoutes, "Hide Bus Routes");
        routesOn = true;
        return;
      }

      map.removeLayer(routesLayer);
      routesOn = false;

      setButtonOff(btnRoutes, "Show Bus Routes");
    });
  }

  // -------- Income button --------
  const btnIncome = document.getElementById("toggleIncome");
  if (!btnIncome) {
    console.warn('Button with id="toggleIncome" not found in HTML.');
  } else {
    btnIncome.addEventListener("click", async () => {
      if (!incomeOn) {
        if (foodOn || walkOn) {
          turnOffSelectedOverlays();
        } else {
          turnOffAllOverlays();
        }

        if (!incomeLayer) incomeLayer = await buildIncomeLayer();

        incomeLayer.addTo(map);
        map.fitBounds(incomeLayer.getBounds());

        if (!incomeLegend) incomeLegend = addIncomeLegend(map);

        setButtonOn(btnIncome, "Hide Income");
        incomeOn = true;
        return;
      }

      map.removeLayer(incomeLayer);
      incomeOn = false;

      if (incomeLegend) {
        map.removeControl(incomeLegend);
        incomeLegend = null;
      }

      setButtonOff(btnIncome, "Show Income");
    });
  }

  // -------- Under 18 button --------
  const btnU18 = document.getElementById("toggleU18");
  if (btnU18) {
    btnU18.addEventListener("click", async () => {
      if (!u18On) {
        if (foodOn || walkOn) {
          turnOffSelectedOverlays();
        } else {
          turnOffAllOverlays();
        }

        if (!u18Layer) u18Layer = await buildUnder18Layer();

        u18Layer.addTo(map);
        map.fitBounds(u18Layer.getBounds());

        if (!u18Legend) u18Legend = addU18Legend(map);

        setButtonOn(btnU18, "Hide Under 18");
        u18On = true;
        return;
      }

      map.removeLayer(u18Layer);
      u18On = false;

      if (u18Legend) {
        map.removeControl(u18Legend);
        u18Legend = null;
      }

      setButtonOff(btnU18, "Show Under 18");
    });
  }

  // -------- Over 65 button --------
  const btn65 = document.getElementById("toggle65");
  if (btn65) {
    btn65.addEventListener("click", async () => {
      if (!over65On) {
        if (foodOn || walkOn) {
          turnOffSelectedOverlays();
        } else {
          turnOffAllOverlays();
        }

        if (!over65Layer) over65Layer = await buildOver65Layer();

        over65Layer.addTo(map);
        map.fitBounds(over65Layer.getBounds());

        if (!over65Legend) over65Legend = addOver65Legend(map);

        setButtonOn(btn65, "Hide Over 65");
        over65On = true;
        return;
      }

      map.removeLayer(over65Layer);
      over65On = false;

      if (over65Legend) {
        map.removeControl(over65Legend);
        over65Legend = null;
      }

      setButtonOff(btn65, "Show Over 65");
    });
  }

  // -------- Food Insecurity button --------
  const btnFood = document.getElementById("toggleFood");
  if (btnFood) {
    btnFood.addEventListener("click", async () => {
      if (!foodOn) {
        if (!foodLayer) foodLayer = await buildFoodInsecurityLayer();

        foodLayer.addTo(map);
        map.fitBounds(foodLayer.getBounds());

        if (!foodLegend) foodLegend = addFoodInsecurityLegend(map);

        foodOn = true;
        setButtonOn(btnFood, "Hide Food Insecurity");
        return;
      }

      map.removeLayer(foodLayer);
      foodOn = false;

      if (foodLegend) {
        map.removeControl(foodLegend);
        foodLegend = null;
      }

      setButtonOff(btnFood, "Show Food Insecurity");
    });
  }

  // -------- Client Pins button --------
  const btnClients = document.getElementById("toggleClients");
  btnClients.addEventListener("click", async () => {
    if (!clientsOn) {
      if (foodOn || walkOn) {
        turnOffSelectedOverlays();
      } else {
        turnOffAllOverlays();
      }

      if (!clientsLayer) clientsLayer = await buildClientClusterLayer();

      clientsLayer.addTo(map);

      setButtonOn(btnClients, "Hide Partners");
      clientsOn = true;
      return;
    }

    map.removeLayer(clientsLayer);
    clientsOn = false;

    setButtonOff(btnClients, "Show Partners");
  });

  // -------- Walking Coverage button --------
  const btnWalk = document.getElementById("toggleWalk");
  if (!btnWalk) {
    console.warn('Button with id="toggleWalk" not found in HTML.');
  } else {
    btnWalk.addEventListener("click", async () => {
      if (!walkOn) {
        if (!walkLayer) walkLayer = await buildWalkingCoverageLayer();

        walkLayer.addTo(map);
        try { map.fitBounds(walkLayer.getBounds()); } catch (e) { }

        if (!walkLegend) walkLegend = addWalkLegend(map);

        walkOn = true;
        setButtonOn(btnWalk, "Hide Walking Coverage");
        return;
      }

      map.removeLayer(walkLayer);
      walkOn = false;

      if (walkLegend) {
        map.removeControl(walkLegend);
        walkLegend = null;
      }

      setButtonOff(btnWalk, "Show Walking Coverage");
    });
  }

  // Tracts toggle (show all the time)
  try {
    const tractLayer = await addTractLayer(map);
    tractLayer.addTo(map);
  } catch (e) { console.warn("Tract layer failed to load:", e); }

  main().catch(err => console.error("Error in main:", err));
});


