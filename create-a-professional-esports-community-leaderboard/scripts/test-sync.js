const fs = require('fs');

(async () => {
  try {
    const teams = JSON.parse(fs.readFileSync('data/teams.json', 'utf8'));
    const payload = { password: process.env.ADMIN_PASSWORD || 'pooja', teams };
    const res = await fetch('http://localhost:3003/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('status', res.status);
    console.log('body', text);
  } catch (err) {
    console.error('error', err && err.message ? err.message : String(err));
    process.exit(1);
  }
})();
