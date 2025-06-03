export default async function handler(req, res) {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send("Missing 'url' query parameter.");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // Optionally forward the user agent or other headers
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      }
    });

    // Get content type from the target site
    const contentType = response.headers.get('content-type') || 'text/html';
    const body = await response.text();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*"); // For testing CORS
    res.status(200).send(body);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("Error fetching target URL: " + error.message);
  }
}
