const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = async (req, res) => {
  // Extract the target URL from the path (e.g., /http://example.com → http://example.com)
  const targetUrl = req.url.slice(1);

  // Validate URL format (must start with http:// or https://)
  if (!targetUrl.match(/^https?:\/\//)) {
    return res.status(400).json({ 
      error: "Invalid URL format. Must include http:// or https:// (e.g., /http://example.com)", 
    });
  }

  // Remove Vercel-added headers to avoid issues
  delete req.headers['x-vercel-id'];
  delete req.headers['x-vercel-ip'];

  // Create a proxy middleware instance
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    followRedirects: true,
    xfwd: false, // Do not add X-Forwarded-* headers
    onProxyReq: (proxyReq) => {
      // Remove cookies and other unwanted headers
      proxyReq.removeHeader('cookie');
      proxyReq.removeHeader('cookie2');
    },
    onError: (err, req, res) => {
      res.status(500).json({ error: "Proxy error: " + err.message });
    },
  });

  // Execute the proxy
  return new Promise((resolve, reject) => {
    proxy(req, res, (err) => {
      if (err) {
        console.error('Proxy error:', err);
        return reject(err);
      }
      resolve();
    });
  });
};
