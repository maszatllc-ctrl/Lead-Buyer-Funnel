module.exports = function handler(req, res) {
  const pixelId = process.env.FB_PIXEL_ID || '';
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(`window.__FB_PIXEL_ID="${pixelId}";`);
};
