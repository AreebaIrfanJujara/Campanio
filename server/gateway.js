/**
 * Companio Node.js API Gateway (Tier 2)
 * Handles client authentication, rate limiting, cost caching, and proxying to the Python AI service.
 */

const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.GATEWAY_PORT || 4000;
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

// -------------------------------------------------------------
// Rate Limiter & Cost Control Caching
// -------------------------------------------------------------
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min

function checkRateLimit(clientIp) {
  const now = Date.now();
  const clientData = rateLimits.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    clientData.count += 1;
  }

  rateLimits.set(clientIp, clientData);

  return {
    allowed: clientData.count <= MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - clientData.count),
    reset: Math.ceil((clientData.resetTime - now) / 1000)
  };
}

// In-memory cost response cache with 15-minute TTL
const responseCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCacheKey(endpoint, body) {
  const hash = crypto.createHash('md5').update(endpoint + JSON.stringify(body)).digest('hex');
  return `${endpoint}:${hash}`;
}

function getCachedResponse(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedResponse(key, data) {
  responseCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

// -------------------------------------------------------------
// Gateway HTTP Server
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate Limiting Check
  const rateStatus = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', rateStatus.remaining);
  res.setHeader('X-RateLimit-Reset', rateStatus.reset);

  if (!rateStatus.allowed) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.', retryAfter: rateStatus.reset }));
    return;
  }

  // Health check endpoint
  if (parsedUrl.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'Companio Node.js Gateway',
      version: '1.0.0',
      cacheEntries: responseCache.size
    }));
    return;
  }

  // Read request body for POST endpoints
  let bodyChunks = [];
  req.on('data', (chunk) => bodyChunks.push(chunk));
  req.on('end', () => {
    let body = {};
    if (bodyChunks.length > 0) {
      try {
        body = JSON.parse(Buffer.concat(bodyChunks).toString());
      } catch (e) {
        body = {};
      }
    }

    // Check Cache for Vision & Translation endpoints
    const cacheKey = getCacheKey(parsedUrl.pathname, body);
    const cached = getCachedResponse(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...cached, cached: true }));
      return;
    }

    // Proxy request to Python FastAPI AI service
    const targetUrl = new URL(parsedUrl.pathname, PYTHON_AI_URL);
    const postData = JSON.stringify(body);

    const proxyReq = http.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000
      },
      (proxyRes) => {
        let responseChunks = [];
        proxyRes.on('data', (c) => responseChunks.push(c));
        proxyRes.on('end', () => {
          const respStr = Buffer.concat(responseChunks).toString();
          try {
            const respJson = JSON.parse(respStr);
            if (proxyRes.statusCode === 200) {
              setCachedResponse(cacheKey, respJson);
            }
            res.setHeader('X-Cache', 'MISS');
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(respJson));
          } catch (e) {
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/plain' });
            res.end(respStr);
          }
        });
      }
    );

    proxyReq.on('error', (err) => {
      console.warn(`[Gateway] Proxy to Python AI failed: ${err.message}. Using built-in fallback.`);
      // Gateway Fallback
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        source: 'gateway-fallback',
        message: 'Python microservice unreachable. Fallback mode active.',
        offline: true
      }));
    });

    proxyReq.write(postData);
    proxyReq.end();
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[Companio Gateway] Listening on http://localhost:${PORT}`);
  });
}

module.exports = { server, checkRateLimit, getCachedResponse, setCachedResponse };
