/**
 * Geocoding Proxy Server
 * Handles CORS issues when calling Nominatim API from browser
 * 
 * Installation:
 *   npm install express axios
 * 
 * Usage:
 *   node geocode-proxy-server.js
 * 
 * The server will run on http://localhost:3000
 */

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Enable CORS for all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Rate limiting tracking
const requestTimes = [];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 30; // Conservative limit

function checkRateLimit() {
  const now = Date.now();
  // Remove old requests outside the window
  while (requestTimes.length > 0 && requestTimes[0] < now - RATE_LIMIT_WINDOW) {
    requestTimes.shift();
  }
  
  if (requestTimes.length >= MAX_REQUESTS_PER_MINUTE) {
    return false; // Rate limit exceeded
  }
  
  requestTimes.push(now);
  return true;
}

// Geocoding endpoint
app.get('/geocode', async (req, res) => {
  // Check rate limit
  if (!checkRateLimit()) {
    console.log('⚠️  Rate limit exceeded - waiting...');
    return res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: 'Too many requests. Please wait before retrying.' 
    });
  }

  const query = req.query.q;
  const countrycodes = req.query.countrycodes || 'us';
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  try {
    console.log(`📍 Geocoding: ${query}`);
    
    const nominatimUrl = 'https://nominatim.openstreetmap.org/search';
    const response = await axios.get(nominatimUrl, {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        countrycodes: countrycodes
      },
      headers: {
        'User-Agent': 'Geocode-Proxy-Server/1.0',
        'Accept-Language': 'en'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`✓ Success: Found ${response.data.length} result(s)`);
    res.json(response.data);
    
  } catch (error) {
    console.error(`✗ Error geocoding "${query}":`, error.message);
    
    if (error.response) {
      // Nominatim returned an error
      res.status(error.response.status).json({
        error: 'Nominatim API error',
        status: error.response.status,
        message: error.message
      });
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      res.status(504).json({
        error: 'Request timeout',
        message: 'The geocoding request took too long'
      });
    } else {
      // Network or other error
      res.status(500).json({
        error: 'Server error',
        message: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const recentRequests = requestTimes.filter(time => time > Date.now() - RATE_LIMIT_WINDOW);
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    requestsLastMinute: recentRequests.length,
    rateLimit: `${MAX_REQUESTS_PER_MINUTE} requests/minute`
  });
});

// Root endpoint with instructions
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Geocoding Proxy Server</title></head>
      <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <h1>🌍 Geocoding Proxy Server</h1>
        <p><strong>Status:</strong> Running</p>
        <p><strong>Port:</strong> ${PORT}</p>
        
        <h2>Usage</h2>
        <p>Make GET requests to:</p>
        <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px;">http://localhost:${PORT}/geocode?q=YOUR_ADDRESS</pre>
        
        <h3>Example:</h3>
        <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px;">http://localhost:${PORT}/geocode?q=833+S+30th+Street+South+Bend+IN+46628</pre>
        
        <h3>Parameters:</h3>
        <ul>
          <li><code>q</code> - Address to geocode (required)</li>
          <li><code>countrycodes</code> - Country filter (default: us)</li>
        </ul>
        
        <h3>Rate Limit:</h3>
        <p>Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute</p>
        
        <h3>Health Check:</h3>
        <p><a href="/health">/health</a> - Check server status</p>
        
        <hr>
        <p><small>This proxy forwards requests to OpenStreetMap Nominatim API while handling CORS</small></p>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║      🌍 Geocoding Proxy Server Started           ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Server running at: http://localhost:${PORT}`);
  console.log(`✓ Geocode endpoint: http://localhost:${PORT}/geocode?q=ADDRESS`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Rate limit: ${MAX_REQUESTS_PER_MINUTE} requests/minute`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});
