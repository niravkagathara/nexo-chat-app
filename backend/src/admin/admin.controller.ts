import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../prisma.service';
import { BackupService } from '../backup/backup.service';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private backupService: BackupService,
  ) {}

  private async checkPermission(req: any, action: string) {
    if (req.user.role === 'superadmin') {
      return;
    }
    const perm = await this.prisma.rolePermission.findUnique({
      where: {
        role_action: {
          role: req.user.role,
          action,
        },
      },
    });
    if (!perm || !perm.allowed) {
      throw new ForbiddenException(`Access denied. You do not have permission to ${action.replace('_', ' ')}.`);
    }
  }

  // ─── Dashboard Stats ──────────────────────────────────────────────────────────
  @Get('stats')
  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const totalRooms = await this.prisma.room.count();
    const totalMessages = await this.prisma.message.count();
    const totalCalls = await this.prisma.callSession.count();
    const totalFiles = await this.prisma.attachment.count();

    const storageSum = await this.prisma.attachment.aggregate({
      _sum: {
        fileSize: true,
      },
    });

    const storageSize = storageSum._sum.fileSize || 0;

    // Get message volume trends over the last 7 days (database-agnostic)
    const messageTrend: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await this.prisma.message.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const label = date.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      messageTrend.push({ label, count });
    }

    return {
      totalUsers,
      totalRooms,
      totalMessages,
      totalCalls,
      totalFiles,
      storageSize,
      messageTrend,
    };
  }

  // ─── User Management ──────────────────────────────────────────────────────────
  @Get('users')
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        statusMessage: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => ({
      ...user,
      messageCount: user._count.messages,
    }));
  }

  @Post('users')
  async createUser(@Body() body: any, @Req() req: any) {
    await this.checkPermission(req, 'manage_users');

    const { name, email, password, role } = body;
    if (!name || !email || !password) {
      throw new BadRequestException('Name, email, and password are required');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const newUser = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'user',
        avatarUrl: initials,
        status: 'online',
      },
    });

    const { password: _, ...result } = newUser;
    return result;
  }

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; email?: string; role?: string; avatarUrl?: string },
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'manage_users');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Security constraints
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('Only superadmins can modify a superadmin account.');
    }
    if (body.role && body.role !== user.role && req.user.role !== 'superadmin') {
      throw new ForbiddenException('Only superadmins can modify user roles.');
    }

    if (body.email && body.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
      if (existing) throw new BadRequestException('Email already in use');
    }

    // Role validations
    if (body.role && !['user', 'admin', 'superadmin'].includes(body.role)) {
      throw new BadRequestException('Invalid role specified');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        avatarUrl: body.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password?: string },
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'manage_users');

    if (!body.password || body.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('Only superadmins can reset a superadmin password.');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successfully' };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.checkPermission(req, 'manage_users');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'superadmin') {
      throw new ForbiddenException('Superadmin accounts cannot be deleted.');
    }

    // Prevent deleting self
    if (id === req.user.id) {
      throw new BadRequestException('Cannot delete your own admin account');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  // ─── Room/Channel Management ──────────────────────────────────────────────────
  @Get('rooms')
  async getRooms() {
    const rooms = await this.prisma.room.findMany({
      select: {
        id: true,
        name: true,
        isGroup: true,
        dmStatus: true,
        createdAt: true,
        participants: {
          select: {
            isAdmin: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rooms.map(room => ({
      id: room.id,
      name: room.name,
      isGroup: room.isGroup,
      dmStatus: room.dmStatus,
      createdAt: room.createdAt,
      messageCount: room._count.messages,
      members: room.participants.map(p => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        isAdmin: p.isAdmin,
        joinedAt: p.joinedAt,
      })),
    }));
  }

  @Delete('rooms/:id')
  async deleteRoom(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.checkPermission(req, 'manage_rooms');

    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');

    return this.prisma.room.delete({
      where: { id },
    });
  }

  // ─── Room Members Management ────────────────────────────────────────────────
  @Post('rooms/:roomId/members')
  async addRoomMember(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() body: { userId: number },
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'manage_rooms');

    const { userId } = body;
    if (!userId) throw new BadRequestException('userId is required');

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existingPart = await this.prisma.participant.findUnique({
      where: {
        userId_roomId: { userId, roomId },
      },
    });

    if (existingPart) {
      throw new BadRequestException('User is already a member of this room');
    }

    return this.prisma.participant.create({
      data: {
        userId,
        roomId,
        isAdmin: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  @Delete('rooms/:roomId/members/:userId')
  async removeRoomMember(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'manage_rooms');

    const participant = await this.prisma.participant.findUnique({
      where: {
        userId_roomId: { userId, roomId },
      },
    });

    if (!participant) throw new NotFoundException('Member not found in this room');

    await this.prisma.participant.delete({
      where: {
        userId_roomId: { userId, roomId },
      },
    });

    return { message: 'Member removed from room successfully' };
  }

  @Put('rooms/:roomId/members/:userId/toggle-admin')
  async toggleRoomMemberAdmin(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'manage_rooms');

    const participant = await this.prisma.participant.findUnique({
      where: {
        userId_roomId: { userId, roomId },
      },
    });

    if (!participant) throw new NotFoundException('Member not found in this room');

    const updated = await this.prisma.participant.update({
      where: {
        userId_roomId: { userId, roomId },
      },
      data: {
        isAdmin: !participant.isAdmin,
      },
    });

    return { message: `Member admin status updated to ${updated.isAdmin}`, isAdmin: updated.isAdmin };
  }

  // ─── File Management ──────────────────────────────────────────────────────────
  @Get('files')
  async getFiles() {
    const files = await this.prisma.attachment.findMany({
      include: {
        message: {
          select: {
            roomId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return files.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      fileUrl: file.fileUrl,
      fileSize: file.fileSize,
      messageId: file.messageId,
      roomId: file.message?.roomId,
      uploader: file.message?.user,
    }));
  }

  @Delete('files/:id')
  async deleteFile(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.checkPermission(req, 'manage_files');

    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) throw new NotFoundException('File attachment not found');

    // 1. Delete physical file from disk if it exists
    if (attachment.fileUrl.startsWith('/uploads/')) {
      const fileName = attachment.fileUrl.replace('/uploads/', '');
      const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Disk Cleanup] Deleted physical file: ${filePath}`);
        }
      } catch (err) {
        console.error(`Failed to delete physical file on disk: ${filePath}`, err);
      }
    }

    // 2. Delete database attachment record
    await this.prisma.attachment.delete({
      where: { id },
    });

    // 3. Delete the parent message if it has no other content/purpose
    // This is optional but keeps the database clean.
    try {
      await this.prisma.message.delete({
        where: { id: attachment.messageId },
      });
    } catch (e) {
      // Message might have already been deleted or contains other attachments
    }

    return { message: 'File deleted successfully' };
  }

  // ─── Call History Management ──────────────────────────────────────────────────
  @Get('calls')
  async getCalls() {
    const calls = await this.prisma.callSession.findMany({
      include: {
        room: {
          select: {
            name: true,
            isGroup: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return calls.map(call => ({
      ...call,
      participants: (() => {
        try { return JSON.parse(call.participants || '[]'); }
        catch { return []; }
      })(),
    }));
  }

  // ─── Manual Backup Trigger ────────────────────────────────────────────────────
  @Post('backup/trigger')
  @HttpCode(HttpStatus.OK)
  async triggerBackup(@Req() req: any) {
    await this.checkPermission(req, 'trigger_backup');
    try {
      const result = await this.backupService.runBackup();
      return { success: true, ...result };
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Backup failed');
    }
  }

  // ─── Permission Management (Superadmin Only) ──────────────────────────────────
  @Get('permissions')
  async getPermissions(@Req() req: any) {
    if (req.user.role !== 'superadmin') {
      throw new ForbiddenException('Only superadmins can view permission configuration.');
    }
    return this.prisma.rolePermission.findMany({
      orderBy: { action: 'asc' },
    });
  }

  @Put('permissions')
  async updatePermissions(@Req() req: any, @Body() body: { role: string; permissions: { [action: string]: boolean } }) {
    if (req.user.role !== 'superadmin') {
      throw new ForbiddenException('Only superadmins can update permission configuration.');
    }
    const { role, permissions } = body;
    if (!role || !permissions) {
      throw new BadRequestException('Role and permissions mapping are required');
    }

    if (role === 'superadmin') {
      throw new BadRequestException('Permissions for superadmin cannot be customized.');
    }

    const results: any[] = [];
    for (const [action, allowed] of Object.entries(permissions)) {
      const updated = await this.prisma.rolePermission.upsert({
        where: {
          role_action: { role, action },
        },
        update: { allowed },
        create: { role, action, allowed },
      });
      results.push(updated);
    }

    return { message: `Permissions for ${role} updated successfully`, results };
  }
}
