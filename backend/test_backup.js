// Test Google Drive backup via the admin API
// Usage: node test_backup.js <superadmin_email> <password>

const http = require('http');

const API = 'http://localhost:3000';
const email = process.argv[2] || 'niravkagathara4@gmail.com';
const password = process.argv[3] || 'admin123';

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log(`\n🔐 Logging in as: ${email}`);
  const loginRes = await post('/auth/login', { email, password });

  if (!loginRes.body.token) {
    console.error('❌ Login failed:', JSON.stringify(loginRes.body, null, 2));
    console.log('\n💡 Tip: Run with your actual credentials:');
    console.log('   node test_backup.js <your_email> <your_password>\n');
    process.exit(1);
  }

  const token = loginRes.body.token;
  const user = loginRes.body.user;
  console.log(`✅ Logged in as: ${user.name} (role: ${user.role})`);

  if (user.role !== 'superadmin') {
    console.error(`❌ User role is "${user.role}" — need "superadmin" to trigger backup.`);
    process.exit(1);
  }

  console.log('\n📤 Triggering Google Drive backup...');
  const backupRes = await post('/admin/backup/trigger', {}, token);

  console.log(`\n📊 Response (HTTP ${backupRes.status}):`);
  console.log(JSON.stringify(backupRes.body, null, 2));

  if (backupRes.status === 200 && backupRes.body.success) {
    console.log('\n✅ BACKUP SUCCESSFUL!');
    console.log(`   JSON uploaded : ${backupRes.body.jsonUploaded}`);
    console.log(`   DB uploaded   : ${backupRes.body.dbUploaded}`);
    console.log(`   Code uploaded : ${backupRes.body.codeUploaded}`);
    console.log(`   Message       : ${backupRes.body.message}`);
    console.log('\n🔗 Check your Google Drive folder:');
    console.log('   https://drive.google.com/drive/folders/1_nyvh6i0kV9BC7JQu2_14j8gcO1n9VSM');
  } else if (backupRes.body.message && backupRes.body.message.includes('credentials not found')) {
    console.log('\n⚠️  No Google service account credentials found!');
    console.log('\n📋 To fix: Place your service account key at one of these locations:');
    console.log('   1. d:\\projects\\backend\\google-service-account.json');
    console.log('   2. Set GDRIVE_SERVICE_ACCOUNT_KEY env var to the JSON string');
    console.log('\n📖 How to get a service account key:');
    console.log('   1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts');
    console.log('   2. Create / select a service account');
    console.log('   3. Keys → Add Key → Create new key → JSON → Download');
    console.log('   4. Share your GDrive folder with the service account email');
    console.log('   5. Place the downloaded JSON file as: d:\\projects\\backend\\google-service-account.json');
  } else {
    console.error('\n❌ Backup failed:', backupRes.body);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
