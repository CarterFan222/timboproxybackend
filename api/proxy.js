export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url);
    let html = await response.text();

    // Clean headers so site can be embedded in iframe
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Fix relative paths by adding <base href>
    html = html.replace(/<head>/i, `<head><base href="${url}">`);

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch target site.");
  }
}
