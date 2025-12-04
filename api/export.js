module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      supportedFormats: ['csv', 'json', 'markdown']
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { testCases, format } = req.body || {};
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: 'No test cases provided' });
  }

  return res.status(200).json({
    success: true,
    message: `Ready to export ${testCases.length} test cases as ${format || 'json'}`,
    count: testCases.length
  });
};