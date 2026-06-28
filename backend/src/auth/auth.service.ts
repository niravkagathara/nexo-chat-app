import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return null;

    let isMatch = false;
    let shouldMigrateHash = false;

    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(pass, user.password);
    } else {
      // Plain text password fallback
      isMatch = pass === user.password;
      shouldMigrateHash = isMatch;
    }

    if (!isMatch) return null;

    if (shouldMigrateHash) {
      const hashedPassword = await bcrypt.hash(pass, 12);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }).catch((err) => console.error('Failed to migrate password to bcrypt:', err));
    }

    const { password, resetCode, resetCodeExpiry, ...result } = user;
    return result;
  }

  // ─── Create JWT token ────────────────────────────────────────────────────────
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, name: user.name };
    const actions = ['manage_users', 'manage_rooms', 'manage_files', 'trigger_backup'];
    const permissions: { [key: string]: boolean } = {};

    if (user.role === 'superadmin') {
      for (const action of actions) {
        permissions[action] = true;
      }
    } else if (user.role === 'admin') {
      const dbPerms = await this.prisma.rolePermission.findMany({
        where: { role: 'admin' },
      });
      for (const action of actions) {
        const found = dbPerms.find((p) => p.action === action);
        permissions[action] = found ? found.allowed : false;
      }
    } else {
      for (const action of actions) {
        permissions[action] = false;
      }
    }

    return {
      user: {
        ...user,
        permissions,
      },
      token: this.jwtService.sign(payload),
    };
  }

  // ─── Register new user ───────────────────────────────────────────────────────
  async register(data: { name: string; email: string; password: string; avatarUrl?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('Email already registered');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const initials = data.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const newUser = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        avatarUrl: data.avatarUrl || initials,
        status: 'online',
      },
    });

    const { password, resetCode, resetCodeExpiry, ...result } = newUser;
    return result;
  }

  // ─── Google OAuth — find or create user ─────────────────────────────────────
  async googleLogin(
    profile: {
      googleId: string;
      email: string;
      name: string;
      avatarUrl?: string;
    },
    mode: string,
  ) {
    // Try by googleId first
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });

    if (mode === 'register') {
      // For registration mode, if they already exist, prevent duplication
      if (user) {
        throw new ConflictException('Account already exists. Please log in instead.');
      }
      const existingUserByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (existingUserByEmail) {
        throw new ConflictException('Account already exists. Please log in instead.');
      }

      // Create brand-new user via Google
      const initials = profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      user = await this.prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl || initials,
          status: 'online',
        },
      });
    } else {
      // mode === 'login'
      if (!user) {
        // Try by email (existing account — link Google ID)
        user = await this.prisma.user.findUnique({ where: { email: profile.email } });
        if (user) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { googleId: profile.googleId },
          });
        } else {
          // No account exists — block automatic registration on login
          throw new NotFoundException('No account found for this Google email. Please register first.');
        }
      }
    }

    const { password, resetCode, resetCodeExpiry, ...result } = user as any;
    return result;
  }

  // ─── Get all users ───────────────────────────────────────────────────────────
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        statusMessage: true,
        createdAt: true,
      },
    });
  }

  // ─── Verify JWT token ────────────────────────────────────────────────────────
  async verifyToken(token: string) {
    const payload = this.jwtService.verify(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        statusMessage: true,
        role: true,
      },
    });
    if (!user) return null;

    const actions = ['manage_users', 'manage_rooms', 'manage_files', 'trigger_backup'];
    const permissions: { [key: string]: boolean } = {};

    if (user.role === 'superadmin') {
      for (const action of actions) {
        permissions[action] = true;
      }
    } else if (user.role === 'admin') {
      const dbPerms = await this.prisma.rolePermission.findMany({
        where: { role: 'admin' },
      });
      for (const action of actions) {
        const found = dbPerms.find((p) => p.action === action);
        permissions[action] = found ? found.allowed : false;
      }
    } else {
      for (const action of actions) {
        permissions[action] = false;
      }
    }

    return {
      ...user,
      permissions,
    };
  }

  // ─── Update profile ──────────────────────────────────────────────────────────
  async updateProfile(
    userId: number,
    data: {
      name?: string;
      avatarUrl?: string;
      status?: string;
      statusMessage?: string;
      password?: string;
    },
  ) {
    const updateData: any = {
      name: data.name,
      avatarUrl: data.avatarUrl,
      status: data.status,
      statusMessage: data.statusMessage,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        statusMessage: true,
      },
    });
  }

  // ─── Forgot Password — send real email ──────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('No account found with that email address');

    // Generate 6-digit code with 15-min expiry
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { resetCode: code, resetCodeExpiry: expiry },
    });

    // Send email via nodemailer
    await this.sendResetEmail(email, user.name, code);

    return { message: `Password reset code sent to ${email}. Check your inbox.` };
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(data: { email: string; code: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new Error('Email not found');
    if (!user.resetCode || user.resetCode !== data.code) throw new Error('Invalid reset code');
    if (!user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      throw new Error('Reset code has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 12);
    await this.prisma.user.update({
      where: { email: data.email },
      data: { password: hashedPassword, resetCode: null, resetCodeExpiry: null },
    });

    return { message: 'Password updated successfully' };
  }

  // ─── Internal: send reset email ─────────────────────────────────────────────
  private async sendResetEmail(toEmail: string, name: string, code: string) {
    const emailUser = this.config.get<string>('EMAIL_USER');
    const emailPass = this.config.get<string>('EMAIL_PASS');
    const emailHost = this.config.get<string>('EMAIL_HOST') || 'smtp.gmail.com';
    const emailPort = parseInt(this.config.get<string>('EMAIL_PORT') || '587');
    const emailFrom = this.config.get<string>('EMAIL_FROM') || emailUser;

    // If credentials are not configured, log the code for development
    if (!emailUser || emailUser === 'your-email@gmail.com') {
      console.log(`[DEV] Password reset code for ${toEmail}: ${code}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: { user: emailUser, pass: emailPass },
    });

    await transporter.sendMail({
      from: emailFrom,
      to: toEmail,
      subject: 'Nexo Chat — Password Reset Code',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #0b0f19; color: #fff; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">🔑 Password Reset</h1>
            <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">Nexo Chat by NexoZone</p>
          </div>
          <div style="padding: 32px;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #cbd5e1;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8;">
              Use the verification code below to reset your password. This code expires in <strong>15 minutes</strong>.
            </p>
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #818cf8; font-family: monospace;">${code}</span>
            </div>
            <p style="margin: 0; font-size: 12px; color: #475569;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          <div style="padding: 16px 32px; background: #0f172a; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #475569;">© 2026 NexoZone · Nexo Chat</p>
          </div>
        </div>
      `,
    });
  }

  async deleteAccount(userId: number) {
    await this.prisma.user.delete({
      where: { id: userId },
    });
    return { success: true };
  }
}
