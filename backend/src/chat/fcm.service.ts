import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: App | null = null;

  onModuleInit() {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        this.firebaseApp = initializeApp({
          credential: cert(serviceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized successfully.');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      }
    } else {
      this.logger.warn(
        `Firebase Service Account file not found at ${serviceAccountPath}. Background push notifications will be disabled.`,
      );
    }
  }

  async sendPushNotification(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
    if (!this.firebaseApp) {
      this.logger.warn('Cannot send notification: Firebase Admin SDK is not initialized.');
      return null;
    }

    try {
      const response = await getMessaging().send({
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });
      this.logger.log(`Successfully sent push notification to token ${fcmToken.substring(0, 10)}...: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending push notification to token ${fcmToken.substring(0, 10)}...:`, error);
      return null;
    }
  }
}
