(async () => {
  try {
    const payload = {
      password: process.env.ADMIN_PASSWORD || 'pooja',
      teams: [
        {
          teamName: 'Unit Test',
          slug: 'unit-test',
          players: 5,
          roster: [ { name: 'Alice', uid: 'UID123' }, { name: 'Bob', uid: 'UID456' } ],
        },
      ],
    };

    const res = await fetch('http://localhost:3006/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body.slice(0, 2000));

    // Read teams.json
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(process.cwd(), 'data', 'teams.json');
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf8');
      console.log('\n--- teams.json head ---\n', content.slice(0, 2000));
    } else {
      console.log('data/teams.json not found');
    }
  } catch (err) {
    console.error('Error', err);
    process.exit(1);
  }
})();
