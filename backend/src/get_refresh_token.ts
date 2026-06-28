import * as http from 'http';
import { exec } from 'child_process';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

const PORT = 3001;
const PATH = '/auth/google/callback';
const REDIRECT_URI = `http://localhost:${PORT}${PATH}`;

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your backend .env file.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent', // Force consent screen to guarantee refresh token is returned
  });

  const server = http.createServer(async (req, res) => {
    if (req.url && req.url.startsWith(PATH)) {
      const urlParams = new URL(req.url, `http://localhost:${PORT}`);
      const code = urlParams.searchParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization Successful!</h1><p>You can close this tab now and return to your terminal.</p>');

        try {
          const { tokens } = await oauth2Client.getToken(code);
          if (!tokens.refresh_token) {
            console.error('\n❌ Warning: No Refresh Token was returned. If you authorized this app previously, Google does not re-send the refresh token unless you revoke access first or try in an Incognito window.');
            console.log('You can revoke access here: https://myaccount.google.com/connections');
            process.exit(1);
          }

          console.log('\n=========================================');
          console.log('✅ Google Drive Authorization Successful!');
          console.log('=========================================');
          console.log('\nCopy the following Refresh Token and add it to your backend .env file:\n');
          console.log(`GDRIVE_REFRESH_TOKEN="${tokens.refresh_token}"`);
          console.log('\n=========================================\n');
          
          // Append/Update directly in .env
          const envPath = path.join(process.cwd(), '.env');
          if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (envContent.includes('GDRIVE_REFRESH_TOKEN=')) {
              envContent = envContent.replace(/GDRIVE_REFRESH_TOKEN=".*"/g, `GDRIVE_REFRESH_TOKEN="${tokens.refresh_token}"`);
              envContent = envContent.replace(/GDRIVE_REFRESH_TOKEN=.*/g, `GDRIVE_REFRESH_TOKEN="${tokens.refresh_token}"`);
            } else {
              envContent += `\n\n# Google Drive Backup Refresh Token\nGDRIVE_REFRESH_TOKEN="${tokens.refresh_token}"`;
            }
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log('📝 Automatically updated your backend .env file with GDRIVE_REFRESH_TOKEN.');
          }

        } catch (err: any) {
          console.error('❌ Failed to retrieve tokens:', err.message || err);
        } finally {
          server.close();
          process.exit(0);
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Failed to get authorization code.');
      }
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      console.error(`👉 Please temporarily stop your running NestJS backend server (so port ${PORT} is free) and run this script again.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`\n🔑 Starting authorization helper server on port ${PORT}...`);
    console.log(`🔗 Opening authorization page in your browser...`);
    console.log(`   If it doesn't open automatically, copy and paste this URL:\n\n   ${authUrl}\n`);

    // Open browser on Windows safely escaping special characters
    exec(`start "" "${authUrl.replace(/&/g, '^&')}"`);
  });
}

main().catch(console.error);
