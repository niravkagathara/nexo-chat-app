import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // socketId → { userId, userName }
  private activeConnections = new Map<string, { userId: number; userName: string }>();

  // userId → Set<socketId>  (one user may have multiple tabs/sockets open)
  private userSockets = new Map<number, Set<string>>();

  private activeCalls = new Map<number, {
    roomId: number;
    callerId: number;
    callerName: string;
    callType: 'video' | 'voice';
    sessionId: number;
    participants: Set<number>;
    startTime: Date;
  }>();

  constructor(
    private chatService: ChatService,
    private prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const conn = this.activeConnections.get(client.id);
    if (!conn) {
      console.log(`Client disconnected (unregistered): ${client.id}`);
      return;
    }

    const { userId, userName } = conn;
    this.activeConnections.delete(client.id);

    // Remove this socket from the user's socket set
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);

      if (sockets.size === 0) {
        // No more active sockets for this user → truly offline
        this.userSockets.delete(userId);

        // Remove from any active calls
        for (const [roomId] of this.activeCalls.entries()) {
          const call = this.activeCalls.get(roomId);
          if (call && call.participants.has(userId)) {
            await this.handleParticipantLeave(roomId, userId);
          }
        }

        // Persist offline status
        await this.prisma.user.update({
          where: { id: userId },
          data: { status: 'offline' },
        }).catch(() => {});

        // Broadcast to everyone
        this.server.emit('userStatusChanged', { userId, status: 'offline' });
        console.log(`User ${userName} (${userId}) → offline (all sockets closed)`);
      } else {
        console.log(`User ${userName} (${userId}) still has ${sockets.size} active socket(s)`);
      }
    }
  }

  async handleParticipantLeave(roomId: number, userId: number) {
    const activeCall = this.activeCalls.get(roomId);
    if (!activeCall) return;

    activeCall.participants.delete(userId);

    if (activeCall.participants.size === 0) {
      const duration = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
      await this.chatService.updateCallSession(activeCall.sessionId, duration, 'completed').catch(() => {});
      this.activeCalls.delete(roomId);
      this.server.to(`room_${roomId}`).emit('callSessionEnded', { id: activeCall.sessionId });
      this.server.to(`room_${roomId}`).emit('activeCallStatus', { roomId, hasActiveCall: false });
    } else {
      this.server.to(`room_${roomId}`).emit('activeCallStatus', {
        roomId,
        hasActiveCall: true,
        call: {
          roomId: activeCall.roomId,
          callerId: activeCall.callerId,
          callerName: activeCall.callerName,
          callType: activeCall.callType,
          sessionId: activeCall.sessionId,
          participants: Array.from(activeCall.participants),
        },
      });
    }
  }

  // ─── Register User (called once on connect, before joining rooms) ────────────
  @SubscribeMessage('registerUser')
  async handleRegisterUser(
    @MessageBody() data: { userId: number; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, userName } = data;

    // Track socket → user
    this.activeConnections.set(client.id, { userId, userName });

    // Track user → sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    const sockets = this.userSockets.get(userId)!;
    const isFirstSocket = sockets.size === 0;
    sockets.add(client.id);

    if (isFirstSocket) {
      // Only update DB and broadcast on the first connection
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'online' },
      }).catch(() => {});

      this.server.emit('userStatusChanged', { userId, status: 'online' });
    }

    console.log(`User registered: ${userName} (${userId}) via socket ${client.id} [${sockets.size} total]`);
  }

  // ─── Join Room ───────────────────────────────────────────────────────────────
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: number; userId: number; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`room_${data.roomId}`);

    // Backward-compat: register the user if registerUser wasn't called
    if (!this.activeConnections.has(client.id)) {
      this.activeConnections.set(client.id, { userId: data.userId, userName: data.userName });

      if (!this.userSockets.has(data.userId)) {
        this.userSockets.set(data.userId, new Set());
      }
      const sockets = this.userSockets.get(data.userId)!;
      const isFirstSocket = sockets.size === 0;
      sockets.add(client.id);

      if (isFirstSocket) {
        await this.prisma.user.update({
          where: { id: data.userId },
          data: { status: 'online' },
        }).catch(() => {});

        this.server.emit('userStatusChanged', { userId: data.userId, status: 'online' });
      }
    }

    // Notify the joining socket of any active call in this room
    const activeCall = this.activeCalls.get(data.roomId);
    if (activeCall) {
      client.emit('activeCallStatus', {
        roomId: data.roomId,
        hasActiveCall: true,
        call: {
          roomId: activeCall.roomId,
          callerId: activeCall.callerId,
          callerName: activeCall.callerName,
          callType: activeCall.callType,
          sessionId: activeCall.sessionId,
          participants: Array.from(activeCall.participants),
        },
      });
    } else {
      client.emit('activeCallStatus', { roomId: data.roomId, hasActiveCall: false });
    }

    console.log(`Client ${client.id} (User: ${data.userName}) joined room_${data.roomId}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() data: { roomId: number }, @ConnectedSocket() client: Socket) {
    client.leave(`room_${data.roomId}`);
    console.log(`Client ${client.id} left room_${data.roomId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody()
    data: { content: string; roomId: number; userId: number; parentId?: number; attachments?: any[] },
  ) {
    const savedMsg = await this.chatService.saveMessage(data);
    this.server.to(`room_${data.roomId}`).emit('roomMessage', savedMsg);
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { userId: number; messageId: number; content: string; roomId: number },
  ) {
    const updatedMsg = await this.chatService.editMessage(data.userId, data.messageId, data.content);
    this.server.to(`room_${data.roomId}`).emit('messageEdited', updatedMsg);
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { userId: number; messageId: number; roomId: number },
  ) {
    const deletedMsg = await this.chatService.deleteMessage(data.userId, data.messageId);
    this.server.to(`room_${data.roomId}`).emit('messageDeleted', deletedMsg);
  }

  @SubscribeMessage('addReaction')
  async handleAddReaction(
    @MessageBody() data: { userId: number; messageId: number; emoji: string; roomId: number },
  ) {
    const updatedReactions = await this.chatService.toggleReaction(data.userId, data.messageId, data.emoji);
    this.server.to(`room_${data.roomId}`).emit('reactionsUpdated', {
      messageId: data.messageId,
      reactions: updatedReactions,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { roomId: number; userId: number; userName: string; isTyping: boolean },
  ) {
    this.server.to(`room_${data.roomId}`).emit('userTyping', data);
  }

  @SubscribeMessage('changeStatus')
  async handleChangeStatus(
    @MessageBody() data: { userId: number; status: string; statusMessage?: string; name?: string; avatarUrl?: string },
  ) {
    const updateData: any = { status: data.status, statusMessage: data.statusMessage };
    if (data.name) updateData.name = data.name;
    if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;

    await this.prisma.user.update({ where: { id: data.userId }, data: updateData }).catch(() => {});

    this.server.emit('userStatusChanged', {
      userId: data.userId,
      status: data.status,
      statusMessage: data.statusMessage,
      name: data.name,
      avatarUrl: data.avatarUrl,
    });
  }

  @SubscribeMessage('pinMessage')
  handlePinMessage(
    @MessageBody() data: { roomId: number; messageId: number; isPinned: boolean; message: any },
  ) {
    this.server.to(`room_${data.roomId}`).emit('messagePinned', data);
  }

  @SubscribeMessage('acceptDM')
  async handleAcceptDM(@MessageBody() data: { roomId: number }) {
    await this.chatService.acceptDMRequest(data.roomId);
    this.server.to(`room_${data.roomId}`).emit('dmStatusUpdated', { roomId: data.roomId, dmStatus: 'accepted' });
    this.server.emit('globalRoomUpdate', { roomId: data.roomId });
  }

  @SubscribeMessage('declineDM')
  async handleDeclineDM(@MessageBody() data: { roomId: number }) {
    await this.chatService.declineDMRequest(data.roomId);
    this.server.to(`room_${data.roomId}`).emit('dmStatusUpdated', { roomId: data.roomId, dmStatus: 'declined' });
    this.server.emit('globalRoomUpdate', { roomId: data.roomId });
  }

  @SubscribeMessage('startCallSession')
  async handleStartCallSession(
    @MessageBody() data: { roomId: number; callerId: number; callerName: string; callType?: 'video' | 'voice' },
  ) {
    const session = await this.chatService.createCallSession(data.roomId, data.callerId, data.callerName);
    const activeCall = {
      roomId: data.roomId,
      callerId: data.callerId,
      callerName: data.callerName,
      callType: data.callType || 'video' as 'video' | 'voice',
      sessionId: session.id,
      participants: new Set([data.callerId]),
      startTime: new Date(),
    };
    this.activeCalls.set(data.roomId, activeCall);

    this.server.to(`room_${data.roomId}`).emit('callSessionStarted', session);
    this.server.to(`room_${data.roomId}`).emit('activeCallStatus', {
      roomId: data.roomId,
      hasActiveCall: true,
      call: {
        roomId: activeCall.roomId,
        callerId: activeCall.callerId,
        callerName: activeCall.callerName,
        callType: activeCall.callType,
        sessionId: activeCall.sessionId,
        participants: Array.from(activeCall.participants),
      },
    });

    const savedMsg = await this.chatService.saveMessage({
      content: `📞 Video call started`,
      roomId: data.roomId,
      userId: data.callerId,
    });
    this.server.to(`room_${data.roomId}`).emit('roomMessage', savedMsg);
  }

  @SubscribeMessage('endCallSession')
  async handleEndCallSession(
    @MessageBody() data: { roomId: number; sessionId: number; duration: number; status: string },
  ) {
    const updated = await this.chatService.updateCallSession(data.sessionId, data.duration, data.status);
    this.server.to(`room_${data.roomId}`).emit('callSessionEnded', updated);
    this.activeCalls.delete(data.roomId);
    this.server.to(`room_${data.roomId}`).emit('activeCallStatus', { roomId: data.roomId, hasActiveCall: false });

    const session = await this.prisma.callSession.findUnique({ where: { id: data.sessionId } });
    if (session) {
      const savedMsg = await this.chatService.saveMessage({
        content: `📞 Video call ended • ${data.duration}s`,
        roomId: session.roomId,
        userId: session.callerId,
      });
      this.server.to(`room_${session.roomId}`).emit('roomMessage', savedMsg);
    }
  }

  @SubscribeMessage('notifyMemberChange')
  handleNotifyMemberChange(@MessageBody() data: { roomId: number }) {
    this.server.to(`room_${data.roomId}`).emit('roomMembersUpdated', { roomId: data.roomId });
    this.server.emit('globalRoomUpdate', { roomId: data.roomId });
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(@MessageBody() data: { roomId: number; userId: number }) {
    const updated = await this.chatService.updateLastRead(data.userId, data.roomId);
    if (updated) {
      this.server.to(`room_${data.roomId}`).emit('roomReadReceipt', {
        roomId: data.roomId,
        userId: data.userId,
        lastReadAt: updated.lastReadAt,
      });
    }
  }

  @SubscribeMessage('videoCallSignal')
  async handleVideoCallSignal(
    @MessageBody()
    data: {
      roomId: number;
      senderId: number;
      senderName: string;
      signal: any;
      type: string;
      targetUserId?: number;
      callType?: 'video' | 'voice';
    },
  ) {
    if (data.type === 'join-call') {
      const activeCall = this.activeCalls.get(data.roomId);
      if (activeCall) {
        activeCall.participants.add(data.senderId);
        // Persist the joining participant in the DB
        await this.chatService.updateCallSession(
          activeCall.sessionId, 
          Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000),
          'active',
          data.senderName,
          data.senderId,
        ).catch(() => {});
        this.server.to(`room_${data.roomId}`).emit('activeCallStatus', {
          roomId: data.roomId,
          hasActiveCall: true,
          call: {
            roomId: activeCall.roomId,
            callerId: activeCall.callerId,
            callerName: activeCall.callerName,
            callType: activeCall.callType,
            sessionId: activeCall.sessionId,
            participants: Array.from(activeCall.participants),
          },
        });
      }
    } else if (data.type === 'hangup') {
      this.handleParticipantLeave(data.roomId, data.senderId);
    }

    this.server.to(`room_${data.roomId}`).emit('videoCallSignal', data);
  }

  @SubscribeMessage('clearChatHistory')
  handleClearChatHistory(@MessageBody() data: { roomId: number }) {
    this.server.to(`room_${data.roomId}`).emit('chatHistoryCleared', { roomId: data.roomId });
  }
}
