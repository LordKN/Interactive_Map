# Geocoding Proxy Server & CSV Tool

This package provides a CORS-enabled proxy server for the Nominatim geocoding API and an HTML tool for batch geocoding CSV files.

## The Problem

When calling the Nominatim API directly from browser JavaScript, you get CORS (Cross-Origin Resource Sharing) errors:
```
Access to fetch at 'https://nominatim.openstreetmap.org/...' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## The Solution

This proxy server runs locally and:
- Accepts requests from your browser
- Forwards them to Nominatim with proper headers
- Returns results with CORS headers enabled
- Implements rate limiting to respect API limits
- Provides detailed logging

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web server framework
- `axios` - HTTP client for API requests

### 2. Start the Proxy Server

```bash
node geocode-proxy-server.js
```

You should see:
```
╔════════════════════════════════════════════════════╗
║      🌍 Geocoding Proxy Server Started              
╚════════════════════════════════════════════════════╝

✓ Server running at: http://localhost:3000
✓ Geocode endpoint: http://localhost:3000/geocode?q=ADDRESS
✓ Health check: http://localhost:3000/health
✓ Rate limit: 30 requests/minute
```

### 3. Open the CSV Geocoder Tool

Open `CSV_Geocoder.html` in your web browser. The tool will automatically use the proxy server.

### 4. Upload and Geocode

1. Click "Choose CSV File"
2. Verify column mappings
3. Click "Start Geocoding"
4. Watch the progress and download the GeoJSON when complete

## How It Works

### Proxy Server Flow

```
Browser → Proxy Server → Nominatim API
   ↓           ↓              ↓
CSV Tool   localhost:3000   OpenStreetMap
```

### Example Request

**Direct (causes CORS error):**
```javascript
fetch('https://nominatim.openstreetmap.org/search?q=address')
// CORS error
```

**Via Proxy (works!):**
```javascript
fetch('http://localhost:3000/geocode?q=address')
// Works perfectly
```

## API Endpoints

### Geocode Address
```
GET http://localhost:3000/geocode?q=ADDRESS
```

**Parameters:**
- `q` (required) - Address to geocode
- `countrycodes` (optional) - Country filter (default: "us")

**Example:**
```bash
curl "http://localhost:3000/geocode?q=833%20S%2030th%20Street%20South%20Bend%20IN%2046628"
```

**Response:**
```json
[
  {
    "lat": "41.6764",
    "lon": "-86.2520",
    "display_name": "833, South 30th Street, South Bend, Indiana, 46628, USA"
  }
]
```

### Health Check
```
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "requestsLastMinute": 5,
  "rateLimit": "30 requests/minute"
}
```

## Rate Limiting

The proxy implements conservative rate limiting:
- **30 requests per minute** to the Nominatim API
- Automatically returns 429 status when limit exceeded
- CSV tool includes built-in delays (5 seconds between requests)

## Troubleshooting

### "Proxy server not running" error

**Problem:** The CSV tool shows: "⚠ Proxy server not running!"

**Solution:** 
```bash
# In a terminal, run:
node geocode-proxy-server.js
```

Keep this terminal window open while geocoding.

### Port 3000 already in use

**Problem:** 
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
1. Stop the process using port 3000, or
2. Edit `geocode-proxy-server.js` and change `const PORT = 3000;` to another port
3. Update the URL in `CSV_Geocoder.html` to match

### Still getting CORS errors

**Problem:** CORS errors even with proxy running

**Solution:**
1. Verify proxy is running at `http://localhost:3000`
2. Check browser console for the actual error
3. Make sure `CSV_Geocoder.html` has `useProxy = true`

## Files

- `geocode-proxy-server.js` - Node.js proxy server
- `package.json` - NPM dependencies
- `CSV_Geocoder.html` - Browser-based geocoding tool
- `README.md` - This file

## CSV File Format

Your CSV should have columns for:
- Name/Organization
- Address
- City
- State
- Zip

The tool auto-detects column names. Example:

```csv
ACTIVE CCFN CLIENTS,Address,City,State,Zip
Food Bank,123 Main St,South Bend,IN,46601
Community Center,456 Oak Ave,Elkhart,IN,46514
```

## Output Format

The tool generates a GeoJSON file:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-86.2520, 41.6764]
      },
      "properties": {
        "name": "Food Bank",
        "address": "123 Main St",
        "city": "South Bend",
        "state": "IN",
        "zip": "46601"
      }
    }
  ]
}
```

## Performance

For **250 addresses**:
- Processing time: ~25-30 minutes
- Success rate: ~95% (depends on address quality)
- Rate: ~10 addresses per minute

## Credits

- Geocoding data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- API: [Nominatim](https://nominatim.org/)

## License

MIT
