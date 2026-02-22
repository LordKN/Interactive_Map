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

      layer.bindPopup(`
        <b>${name}</b><br>
        Poverty: ${povLabel}<br>
        Median Income: ${incLabel}<br>
        Under 18: ${u18Label}<br>
        Over 65: ${o65Label}
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
      if (btnP) btnP.textContent = "Show Poverty";
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

      btn_poverty.textContent = "Hide Poverty";
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

    btn_poverty.textContent = "Show Poverty";
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


