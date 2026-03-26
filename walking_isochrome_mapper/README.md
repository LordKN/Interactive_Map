# WalkReach — Setup

## Why the proxy?
OpenRouteService's free tier doesn't send CORS headers for browser requests,
so direct fetch calls from the browser get blocked. The proxy runs locally,
forwards your requests to ORS, and adds the required CORS headers.

## One-time setup

```bash
# Install dependencies (only needed once)
npm install
```

## Every time you use it

**Terminal 1 — start the proxy:**
```bash
node proxy.js
# You should see: WalkReach proxy running at http://localhost:3001
```

**Browser — open the map:**
Open `walking-isochrone-mapper.html` with VS Code Live Server (or any local server).

That's it. The proxy stays running in the background while you use the map.
Press Ctrl+C in the terminal to stop it when you're done.

## Troubleshooting

- **Port 3001 already in use** — change `PORT` at the top of `proxy.js` to another number (e.g. 3002) and update the URL in the HTML accordingly
- **node-fetch version error** — make sure you're using node-fetch v2 (v3 is ESM only). The package.json pins `^2.7.0`
- **Still getting errors** — check the proxy terminal window; it logs every request and any ORS error responses
