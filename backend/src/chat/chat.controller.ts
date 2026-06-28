import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthService } from '../auth/auth.service';

@Controller('rooms')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private authService: AuthService,
  ) {}

  private async getUserIdFromHeader(authHeader: string): Promise<number> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    const token = authHeader.split(' ')[1];
    const user = await this.authService.verifyToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user.id;
  }

  @Get()
  async getRooms(@Headers('authorization') authHeader: string) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.getUserRooms(userId);
  }

  @Post()
  async createRoom(@Headers('authorization') authHeader: string, @Body() body: any) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.createRoom(userId, body);
  }

  @Get(':id/messages')
  async getMessages(@Headers('authorization') authHeader: string, @Param('id') roomId: string) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.getRoomMessages(Number(roomId));
  }

  @Put(':roomId/messages/:messageId/pin')
  async togglePin(@Headers('authorization') authHeader: string, @Param('messageId') messageId: string) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.togglePinMessage(Number(messageId));
  }

  @Get(':roomId/pinned')
  async getPinned(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.getPinnedMessages(Number(roomId));
  }

  @Get(':roomId/files')
  async getFiles(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.getSharedFiles(Number(roomId));
  }

  // New endpoints:

  @Put(':roomId/mute')
  async toggleMute(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.toggleMuteRoom(userId, Number(roomId));
  }

  @Put(':roomId/pin-sidebar')
  async togglePinSidebar(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.togglePinRoom(userId, Number(roomId));
  }

  @Put(':roomId/read')
  async markAsRead(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.updateLastRead(userId, Number(roomId));
  }

  @Put(':roomId/accept-dm')
  async acceptDM(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.acceptDMRequest(Number(roomId));
  }

  @Put(':roomId/decline-dm')
  async declineDM(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.declineDMRequest(Number(roomId));
  }

  @Get(':roomId/calls')
  async getCalls(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.getCallHistory(Number(roomId));
  }

  @Post(':roomId/members')
  async addMember(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
    @Body() body: { userId: number },
  ) {
    const adminUserId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.addMember(adminUserId, Number(roomId), body.userId);
  }

  @Delete(':roomId/members/:userId')
  async removeMember(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
    @Param('userId') targetUserId: string,
  ) {
    const adminUserId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.removeMember(adminUserId, Number(roomId), Number(targetUserId));
  }

  @Put(':roomId/members/:userId/admin')
  async toggleAdmin(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
    @Param('userId') targetUserId: string,
  ) {
    const adminUserId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.toggleAdminStatus(adminUserId, Number(roomId), Number(targetUserId));
  }

  @Delete(':roomId')
  async deleteRoom(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    const adminUserId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.deleteRoom(adminUserId, Number(roomId));
  }

  @Put(':roomId')
  async renameRoom(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
    @Body() body: { name: string; avatarUrl?: string },
  ) {
    const adminUserId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.updateRoomName(adminUserId, Number(roomId), body.name, body.avatarUrl);
  }

  @Delete(':roomId/messages')
  async clearChat(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
  ) {
    await this.getUserIdFromHeader(authHeader);
    return this.chatService.clearChatHistory(Number(roomId));
  }

  @Post(':roomId/leave')
  async leaveRoom(@Headers('authorization') authHeader: string, @Param('roomId') roomId: string) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.leaveRoom(userId, Number(roomId));
  }

  @Get('backup')
  async getBackup(@Headers('authorization') authHeader: string) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.exportBackup(userId);
  }

  @Post('import')
  async importBackup(@Headers('authorization') authHeader: string, @Body() body: { backup: any }) {
    const userId = await this.getUserIdFromHeader(authHeader);
    return this.chatService.importBackup(userId, body.backup);
  }
}
