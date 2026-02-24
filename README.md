# Cultivate Food Rescue Map

This project visualizes census data and geographic information for the Cultivate Food Rescue initiative. It provides an interactive map with overlays for county boundaries, census tracts, transportation routes, and Cultivate Food Network partner locations.


## Features

- Interactive Leaflet map with toggleable layers:
  - County boundaries (`target_counties.geojson`)
  - Census tracts (`tracts_acs_2024_elk_mar_sj.geojson`)
  - Bus routes (`transpo_routes.geojson`)
  - CCFN Partner locations (`CCFN_Clients.geojson`)
- Dynamic styling based on demographic data:
  - Poverty, income, age groups (under 18, over 65)
- Multiple CSV charts displaying category weights for 2023, 2024, and 2025
- Dark mode toggle for better visualization


## Files Overview

- `index.html`: Main HTML structure, loads styles and scripts
- `styles.css`: Styles for layout, map, and controls
- `app.js`: Core JavaScript for initializing the map, loading GeoJSON layers, handling UI controls, and rendering charts
- CSV logs: `2023_log.csv`, `2024_log.csv`, `2025_log.csv` for category data
- GeoJSON files for geographic boundaries and routes:
  - `target_counties.geojson`
  - `tracts_acs_2024_elk_mar_sj.geojson`
  - `transpo_routes.geojson`
  - `CCFN_Clients.geojson`



## Setup & Usage

### Running Locally

This project requires a local server to properly load fetch resources due to browser security restrictions.

1. Clone the repository:
   ```bash
   git clone https://github.com/LordKN/Interactive_Map
   cd Interactive_Map/
   ```

2. Start a local server:
   - Using VS Code Live Server extension
   - Or via Python:
     ```bash
     python -m http.server 8000
     ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000/index.html
   ```

### Dependencies

- Leaflet.js and related plugins (MarkerCluster)
- Chart.js for charts
- No external backend or database; all data is loaded from static files



## Customization & Extending

- To change the geographic layers, modify the `addTractLayer()` call in `app.js` with a different GeoJSON path.
- To update the data visualizations, replace or add CSV files in the root directory and update `chartsConfig` accordingly.
- To add new map controls or layers, extend the `app.js` functions and update the UI in `index.html`.


## Notes

- Ensure you run this project on a local server environment for fetch() to work correctly.
- The map defaults to a view centered on the specified coordinates with zoom level 9.
- The map supports toggling between light and dark themes via the moon icon.



## License

This project is for internal use and visualization purposes. Please contact the maintainer for licensing details.



## Contact

For questions or contributions, please open an issue or contact the repository maintainer.