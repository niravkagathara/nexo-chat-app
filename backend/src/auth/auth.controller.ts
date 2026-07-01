import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Headers,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────────────
  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    return this.authService.login(user);
  }

  // ─── Register ────────────────────────────────────────────────────────────────
  @Post('register')
  async register(@Body() body: any) {
    try {
      const user = await this.authService.register(body);
      return this.authService.login(user);
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Registration failed');
    }
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    try {
      return await this.authService.forgotPassword(body.email);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────
  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    try {
      return await this.authService.resetPassword(body);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  // ─── Get current user ────────────────────────────────────────────────────────
  @Get('me')
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('No token provided');
    const token = authHeader.split(' ')[1];
    return this.authService.verifyToken(token);
  }

  // ─── Get all users ───────────────────────────────────────────────────────────
  @Get('users')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  // ─── Update profile ──────────────────────────────────────────────────────────
  @Put('profile')
  async updateProfile(@Headers('authorization') authHeader: string, @Body() body: any) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('No token provided');
    const token = authHeader.split(' ')[1];
    const user = await this.authService.verifyToken(token);
    if (!user) throw new UnauthorizedException('Invalid token');
    try {
      return await this.authService.updateProfile(user.id, body);
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Profile update failed');
    }
  }

  // ─── Delete Account ──────────────────────────────────────────────────────────
  @Delete('me')
  async deleteAccount(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('No token provided');
    const token = authHeader.split(' ')[1];
    const user = await this.authService.verifyToken(token);
    if (!user) throw new UnauthorizedException('Invalid token');
    return this.authService.deleteAccount(user.id);
  }

  // ─── Update FCM Token ────────────────────────────────────────────────────────
  @Post('fcm-token')
  async updateFcmToken(@Headers('authorization') authHeader: string, @Body() body: any) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('No token provided');
    const token = authHeader.split(' ')[1];
    const user = await this.authService.verifyToken(token);
    if (!user) throw new UnauthorizedException('Invalid token');
    
    const { fcmToken } = body;
    if (!fcmToken) throw new BadRequestException('fcmToken is required');
    
    await this.authService.updateFcmToken(user.id, fcmToken);
    return { success: true };
  }

  // ─── Google OAuth — initiate ─────────────────────────────────────────────────
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Passport redirects to Google automatically with the state query parameter
  }

  // ─── Google OAuth — callback ─────────────────────────────────────────────────
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const mode = req.query.state || 'login';
    try {
      const user = await this.authService.googleLogin(req.user, mode);
      const { token } = await this.authService.login(user);
      const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

      // Redirect to frontend with token and user info in query params
      const userEncoded = encodeURIComponent(JSON.stringify(user));
      res.redirect(`${frontendUrl}/auth/google-callback?token=${token}&user=${userEncoded}`);
    } catch (e: any) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      let errCode = 'google_auth_failed';
      if (e.message?.includes('already exists') || e.status === 409) {
        errCode = 'google_user_already_exists';
      } else if (e.message?.includes('register first') || e.status === 404) {
        errCode = 'google_user_not_found';
      }
      res.redirect(`${frontendUrl}/login?error=${errCode}`);
    }
  }
}
