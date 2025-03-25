const cors_proxy = require('./lib/cors-anywhere');

module.exports = async (req, res) => {
  // Extract the target URL from the request path
  const targetUrl = req.url.slice(1); // Remove leading slash

  // Validate URL format (must start with http:// or https://)
  if (!targetUrl.match(/^https?:\/\//)) {
    return res.status(400).json({ 
      error: "Invalid URL format. Must include http:// or https://" 
    });
  }

  // Proxy the request using CORS Anywhere
  return new Promise((resolve) => {
    cors_proxy.createServer({
      originWhitelist: [], // Allow all origins
      requireHeader: [], // No required headers
      removeHeaders: [
        'cookie',
        'cookie2',
        'x-heroku-queue-wait-time',
        'x-heroku-queue-depth',
        'x-heroku-dynos-in-use',
        'x-request-start',
      ],
      redirectSameOrigin: true,
      httpProxyOptions: { xfwd: false },
    }).emit('request', req, res, () => resolve());
  });
};
