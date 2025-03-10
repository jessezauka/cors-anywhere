// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 8080;

// Grab the blacklist from the command-line so that we can update the blacklist without deploying
// again. CORS Anywhere is open by design, and this blacklist is not used, except for countering
// immediate abuse (e.g. denial of service). If you want to block all origins except for some,
// use originWhitelist instead.
var originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST);
var originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST);
function parseEnvList(env) {
  if (!env) {
    return [];
  }
  return env.split(',');
}

// Set up rate-limiting to avoid abuse of the public CORS Anywhere server.
var checkRateLimit = require('./lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);

var cors_proxy = require('./lib/cors-anywhere');
var server = cors_proxy.createServer({
  originWhitelist: originWhitelist,
  requireHeader: [],
  removeHeaders: [
    'cookie',
    'cookie2',
    // Strip Heroku-specific headers
    'x-heroku-queue-wait-time',
    'x-heroku-queue-depth',
    'x-heroku-dynos-in-use',
    'x-request-start',
  ],
  redirectSameOrigin: true,
  httpProxyOptions: {
    // Do not add X-Forwarded-For, etc. headers, because Heroku already adds it.
    xfwd: false,
  },
});

// Override the request handler to fix the double slash issue
server.on('request', function(req, res) {
  try {
    console.log('Incoming request:', req.url);

    // Extract the target URL from the request
    const targetUrl = req.url.slice(1); // Remove the leading slash

    // Ensure the target URL starts with http:// or https://
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      throw new Error('The URL is invalid: it must start with http:// or https://');
    }

    // Ensure the double slash after http: or https: is preserved
    const fixedUrl = targetUrl.replace(/^http:\/([^/])/, 'http://$1')
                              .replace(/^https:\/([^/])/, 'https://$1');

    // Update the request URL with the fixed URL
    req.url = '/' + fixedUrl;

    // Proceed with the proxy logic
    cors_proxy.emit('request', req, res);
  } catch (err) {
    console.error('Error:', err.message);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(err.message);
  }
});

server.listen(port, host, function() {
  console.log('Running CORS Anywhere on ' + host + ':' + port);
});
