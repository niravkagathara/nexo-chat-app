import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { google } from 'googleapis';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly folderId = '1_nyvh6i0kV9BC7JQu2_14j8gcO1n9VSM';

  constructor(private prisma: PrismaService) {}

  // Run daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBackup() {
    this.logger.log('Starting scheduled daily backup to Google Drive...');
    try {
      const result = await this.runBackup();
      this.logger.log(`Scheduled daily backup completed successfully: ${JSON.stringify(result)}`);
    } catch (err: any) {
      this.logger.error(`Scheduled daily backup failed: ${err.message || err}`, err.stack);
    }
  }

  async runBackup(): Promise<{ jsonUploaded: boolean; dbUploaded: boolean; codeUploaded: boolean; message: string }> {
    const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
    const credentials = this.getGoogleCredentials();

    if (!refreshToken && !credentials) {
      const msg = 'Google Drive credentials not found. Please set GDRIVE_REFRESH_TOKEN in your .env or place google-service-account.json in the backend root.';
      this.logger.warn(msg);
      return { jsonUploaded: false, dbUploaded: false, codeUploaded: false, message: msg };
    }

    // 2. Authenticate
    let drive;
    if (refreshToken) {
      this.logger.log('Authenticating with Google Drive OAuth2 Refresh Token...');
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        drive = google.drive({ version: 'v3', auth: oauth2Client });
      } catch (err: any) {
        throw new Error(`Google OAuth2 Authentication failed: ${err.message || err}`);
      }
    } else {
      this.logger.log('Authenticating with Google Drive Service Account...');
      try {
        const auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        drive = google.drive({ version: 'v3', auth });
      } catch (err: any) {
        throw new Error(`Google API Authentication failed: ${err.message || err}`);
      }
    }

    const timestamp = new Date().toISOString().split('T')[0];

    // 3. Export all chat data from DB
    const backupJsonData = await this.exportAllChatData();
    const jsonContent = JSON.stringify(backupJsonData, null, 2);
    const jsonStream = new Readable();
    jsonStream.push(jsonContent);
    jsonStream.push(null);

    // Upload JSON data
    let jsonUploaded = false;
    try {
      await drive.files.create({
        requestBody: {
          name: `nexo-chat-data-backup-${timestamp}.json`,
          parents: [this.folderId],
        },
        media: {
          mimeType: 'application/json',
          body: jsonStream,
        },
      });
      jsonUploaded = true;
      this.logger.log(`Uploaded JSON backup: nexo-chat-data-backup-${timestamp}.json`);
    } catch (err: any) {
      this.logger.error(`Failed to upload JSON backup to Google Drive: ${err.message || err}`);
      throw err;
    }

    // 4. Find SQLite DB file
    let dbUploaded = false;
    const dbPaths = [
      path.join(process.cwd(), 'dev.db'),
      path.join(process.cwd(), 'prisma', 'dev.db')
    ];
    let activeDbPath = '';
    for (const p of dbPaths) {
      if (fs.existsSync(p)) {
        activeDbPath = p;
        break;
      }
    }

    if (activeDbPath) {
      try {
        const dbStream = fs.createReadStream(activeDbPath);
        await drive.files.create({
          requestBody: {
            name: `nexo-chat-db-sqlite-${timestamp}.db`,
            parents: [this.folderId],
          },
          media: {
            mimeType: 'application/x-sqlite3',
            body: dbStream,
          },
        });
        dbUploaded = true;
        this.logger.log(`Uploaded SQLite DB backup: nexo-chat-db-sqlite-${timestamp}.db from ${activeDbPath}`);
      } catch (err: any) {
        this.logger.error(`Failed to upload SQLite DB file to Google Drive: ${err.message || err}`);
        throw err;
      }
    } else {
      this.logger.warn('SQLite dev.db file was not found in common paths. Skipping DB file upload.');
    }

    // 5. Archive and upload codebase
    let codeUploaded = false;
    const tempZipPath = path.join(process.cwd(), `nexo-chat-code-backup-${timestamp}.tar.gz`);
    try {
      await this.archiveCodebase(tempZipPath);
      if (fs.existsSync(tempZipPath)) {
        const codeStream = fs.createReadStream(tempZipPath);
        await drive.files.create({
          requestBody: {
            name: `nexo-chat-code-backup-${timestamp}.tar.gz`,
            parents: [this.folderId],
          },
          media: {
            mimeType: 'application/gzip',
            body: codeStream,
          },
        });
        codeUploaded = true;
        this.logger.log(`Uploaded codebase backup: nexo-chat-code-backup-${timestamp}.tar.gz`);
        fs.unlinkSync(tempZipPath);
      }
    } catch (err: any) {
      this.logger.error(`Failed to upload codebase backup to Google Drive: ${err.message || err}`);
      if (fs.existsSync(tempZipPath)) {
        try { fs.unlinkSync(tempZipPath); } catch {}
      }
      throw err;
    }

    return {
      jsonUploaded,
      dbUploaded,
      codeUploaded,
      message: `Backup completed successfully. JSON: ${jsonUploaded}, SQLite DB: ${dbUploaded}, Code: ${codeUploaded}`
    };
  }

  private async archiveCodebase(outputPath: string): Promise<void> {
    this.logger.log(`Archiving codebase to ${outputPath}...`);
    // tar command to compress d:\projects into outputPath, excluding build outputs and heavy binaries/archives
    const command = `tar -czf "${outputPath}" --exclude="node_modules" --exclude=".git" --exclude=".next" --exclude="dist" --exclude="build" --exclude="temp_download.exe" --exclude="*.exe" --exclude="*.zip" --exclude="*.tar.gz" --exclude="*.db" -C "d:\\projects" .`;
    try {
      execSync(command, { stdio: 'ignore' });
      this.logger.log('Codebase archived successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to archive codebase: ${err.message || err}`);
      throw err;
    }
  }

  private getGoogleCredentials(): any | null {
    // 1. Check local file
    const filePath = path.join(process.cwd(), 'google-service-account.json');
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        this.logger.error(`Failed to read or parse local google-service-account.json: ${err}`);
      }
    }

    // 2. Check env variable
    const envKey = process.env.GDRIVE_SERVICE_ACCOUNT_KEY;
    if (envKey) {
      try {
        return JSON.parse(envKey);
      } catch (err) {
        try {
          // If the private key contains escaped newlines
          const sanitized = envKey.replace(/\\n/g, '\n');
          return JSON.parse(sanitized);
        } catch (e) {
          this.logger.error(`Failed to parse GDRIVE_SERVICE_ACCOUNT_KEY env variable: ${err}`);
        }
      }
    }

    return null;
  }

  private async exportAllChatData() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        statusMessage: true,
        role: true,
        createdAt: true,
      }
    });

    const rooms = await this.prisma.room.findMany({
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            attachments: true,
            reactions: true,
          }
        },
        callSessions: true,
      }
    });

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      summary: {
        usersCount: users.length,
        roomsCount: rooms.length,
      },
      users,
      rooms,
    };
  }
}
