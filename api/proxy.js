import fetch from "node-fetch";

function absoluteUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

export default async function handler(req, res) {
  const urlParam = req.query.url;
  if (!urlParam || !urlParam.startsWith("http")) {
    return res.status(400).send("Invalid or missing URL parameter.");
  }

  const url = decodeURIComponent(urlParam);

  try {
    // Fetch original page or asset
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TimboProxy/1.0; +https://timboproxybackend.vercel.app/)",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    // Remove headers that prevent embedding
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    // Proxy CSS, JS, images, fonts as-is (binary-safe)
    if (
      contentType.includes("image") ||
      contentType.includes("javascript") ||
      contentType.includes("css") ||
      contentType.includes("font") ||
      contentType.includes("application/octet-stream")
    ) {
      const buffer = await response.buffer();
      res.setHeader("Content-Type", contentType);
      return res.send(buffer);
    }

    // For HTML, rewrite resource URLs to proxy URLs
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Rewrite all src, href, url() inside HTML/CSS to route via proxy
      // This is a simple regex-based approach — might miss some edge cases
      const proxyPrefix = `/proxy?url=`;

      // Rewrite src and href attributes
      html = html.replace(
        /(src|href)=["']([^"']+)["']/gi,
        (match, attr, link) => {
          // If link is absolute or relative, convert to absolute URL first
          const absoluteLink = absoluteUrl(url, link);

          // Proxy the link
          return `${attr}="${proxyPrefix}${encodeURIComponent(absoluteLink)}"`;
        }
      );

      // Rewrite CSS url() references inside style blocks or attributes
      html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, link) => {
        const absoluteLink = absoluteUrl(url, link);
        return `url(${proxyPrefix}${encodeURIComponent(absoluteLink)})`;
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    // For other types, just proxy as-is
    const buffer = await response.buffer();
    res.setHeader("Content-Type", contentType);
    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Failed to fetch the requested resource.");
  }
}
