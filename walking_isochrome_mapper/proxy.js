/**
 * WalkReach — ORS Proxy Server
 * 
 * Forwards requests to OpenRouteService and adds CORS headers so the
 * browser can call it from localhost without CORS errors.
 * 
 * Usage:
 *   1. npm install express node-fetch   (one time)
 *   2. node proxy.js
 *   3. Open walking-isochrone-mapper.html in your browser
 */

const express  = require('express');
const fetch    = require('node-fetch');
const app      = express();
const PORT     = 3001;
const ORS_BASE = 'https://api.openrouteservice.org';

app.use(express.json());

// Allow all origins (localhost only in practice since this is local)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Forward everything under /ors/* to ORS
app.all('/ors/*', async (req, res) => {
  const orsPath = req.path.replace('/ors', '');
  const orsURL  = `${ORS_BASE}${orsPath}`;

  console.log(`[proxy] ${req.method} ${orsURL}`);

  try {
    const response = await fetch(orsURL, {
      method:  req.method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': req.headers['authorization'] || '',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[proxy] ORS error ${response.status}:`, data);
    }

    res.status(response.status).json(data);
  } catch (err) {
    console.error('[proxy] fetch failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ✅  WalkReach proxy running at http://localhost:' + PORT);
  console.log('  📄  Open walking-isochrone-mapper.html in your browser');
  console.log('  🛑  Press Ctrl+C to stop');
  console.log('');
});
