import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getUserRooms(userId: number) {
    const participants = await this.prisma.participant.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                    status: true,
                    statusMessage: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const roomsData: any[] = [];
    for (const p of participants) {
      const room = p.room;
      const userParticipant = room.participants.find((part) => part.userId === userId);
      const isMuted = userParticipant?.isMuted || false;
      const isAdmin = userParticipant?.isAdmin || false;
      const isPinned = userParticipant?.isPinned || false;
      const lastReadAt = userParticipant?.lastReadAt || new Date(0);

      // Calculate unread message count
      const unreadCount = await this.prisma.message.count({
        where: {
          roomId: room.id,
          createdAt: { gt: lastReadAt },
          userId: { not: userId },
        },
      });

      const mappedParts = room.participants.map((part) => ({
        id: part.id,
        userId: part.userId,
        isAdmin: part.isAdmin,
        isMuted: part.isMuted,
        isPinned: part.isPinned,
        lastReadAt: part.lastReadAt,
        user: part.user,
      }));

      // Determine DM name and avatar if isGroup is false
      if (!room.isGroup) {
        const otherParticipant = room.participants.find((part) => part.userId !== userId);
        roomsData.push({
          ...room,
          isMuted,
          isAdmin,
          isPinned,
          unreadCount,
          lastReadAt,
          participants: mappedParts,
          name: otherParticipant ? otherParticipant.user.name : 'Unknown User',
          avatarUrl: otherParticipant ? otherParticipant.user.avatarUrl : '??',
        });
      } else {
        roomsData.push({
          ...room,
          isMuted,
          isAdmin,
          isPinned,
          unreadCount,
          lastReadAt,
          participants: mappedParts,
          avatarUrl: room.avatarUrl || (room.name ? room.name.substring(0, 2).toUpperCase() : 'GC'),
        });
      }
    }

    return roomsData;
  }

  async createRoom(creatorId: number, data: { name?: string; isGroup: boolean; participantIds: number[]; avatarUrl?: string }) {
    const allParticipantIds = Array.from(new Set([creatorId, ...data.participantIds]));

    // If it's a DM, check if a DM room already exists between the creator and the target participant
    if (!data.isGroup && allParticipantIds.length === 2) {
      const existingRooms = await this.prisma.room.findMany({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: { in: allParticipantIds },
            },
          },
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      // Filter rooms that have EXACTLY these 2 participants
      const matchingRoom = existingRooms.find((r) => r.participants.length === 2);
      if (matchingRoom) {
        return matchingRoom;
      }
    }

    // For a group channel: expand the participant list to include ALL users in the workspace
    let finalParticipantIds = allParticipantIds;
    if (data.isGroup) {
      const allUsers = await this.prisma.user.findMany({ select: { id: true } });
      finalParticipantIds = Array.from(new Set([...allParticipantIds, ...allUsers.map((u) => u.id)]));
    }

    // Create new room
    const newRoom = await this.prisma.room.create({
      data: {
        name: data.isGroup ? (data.name || 'New Group') : null,
        isGroup: data.isGroup,
        dmStatus: data.isGroup ? 'accepted' : 'pending',
        dmRequesterId: data.isGroup ? null : creatorId,
        avatarUrl: data.isGroup ? (data.avatarUrl || null) : null,
        participants: {
          create: finalParticipantIds.map((id) => ({
            userId: id,
            isAdmin: data.isGroup ? (id === creatorId) : false,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    return newRoom;
  }

  async getRoomMessages(roomId: number) {
    return this.prisma.message.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        attachments: true,
        reactions: {
          include: {
            message: {
              select: {
                userId: true,
              },
            },
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveMessage(data: { content: string; roomId: number; userId: number; parentId?: number; attachments?: any[] }) {
    return this.prisma.message.create({
      data: {
        content: data.content,
        roomId: data.roomId,
        userId: data.userId,
        parentId: data.parentId || null,
        attachments: data.attachments
          ? {
              create: data.attachments.map((att) => ({
                fileName: att.fileName,
                fileType: att.fileType,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize,
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        attachments: true,
        reactions: true,
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async editMessage(userId: number, messageId: number, content: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new BadRequestException('Message not found');
    if (msg.userId !== userId) throw new BadRequestException('Unauthorized to edit this message');
    if (msg.isDeleted) throw new BadRequestException('Cannot edit a deleted message');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: true,
        parent: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async deleteMessage(userId: number, messageId: number) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new BadRequestException('Message not found');
    if (msg.userId !== userId) throw new BadRequestException('Unauthorized to delete this message');

    // Delete child attachments
    await this.prisma.attachment.deleteMany({ where: { messageId } });
    // Delete reactions
    await this.prisma.reaction.deleteMany({ where: { messageId } });

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'This message was deleted by this user',
        isDeleted: true,
        isPinned: false,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: true,
        parent: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async acceptDMRequest(roomId: number) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { dmStatus: 'accepted' },
    });
  }

  async declineDMRequest(roomId: number) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { dmStatus: 'declined' },
    });
  }

  async toggleMuteRoom(userId: number, roomId: number) {
    const participant = await this.prisma.participant.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!participant) throw new BadRequestException('Participant not in this room');

    return this.prisma.participant.update({
      where: { id: participant.id },
      data: { isMuted: !participant.isMuted },
    });
  }

  async togglePinRoom(userId: number, roomId: number) {
    const participant = await this.prisma.participant.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!participant) throw new BadRequestException('Participant not in this room');

    return this.prisma.participant.update({
      where: { id: participant.id },
      data: { isPinned: !participant.isPinned },
    });
  }

  async updateLastRead(userId: number, roomId: number) {
    const participant = await this.prisma.participant.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!participant) return null;

    return this.prisma.participant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });
  }

  async addMember(adminUserId: number, roomId: number, targetUserId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new BadRequestException('Room not found');
    if (!room.isGroup) throw new BadRequestException('DMs cannot have members added');

    const requester = room.participants.find((p) => p.userId === adminUserId);
    if (!requester) {
      throw new BadRequestException('Only group members can add other members');
    }

    const existing = room.participants.find((p) => p.userId === targetUserId);
    if (existing) return room;

    await this.prisma.participant.create({
      data: { roomId, userId: targetUserId, isAdmin: false },
    });

    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });
  }

  async removeMember(adminUserId: number, roomId: number, targetUserId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new BadRequestException('Room not found');
    if (!room.isGroup) throw new BadRequestException('DMs cannot have members removed');

    const requester = room.participants.find((p) => p.userId === adminUserId);
    if (!requester || !requester.isAdmin) {
      throw new BadRequestException('Only group admins can remove members');
    }

    const targetPart = room.participants.find((p) => p.userId === targetUserId);
    if (!targetPart) throw new BadRequestException('Member not found in room');

    await this.prisma.participant.delete({
      where: { id: targetPart.id },
    });

    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });
  }

  async toggleAdminStatus(adminUserId: number, roomId: number, targetUserId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new BadRequestException('Room not found');
    if (!room.isGroup) throw new BadRequestException('DMs cannot have admins');

    const requester = room.participants.find((p) => p.userId === adminUserId);
    if (!requester || !requester.isAdmin) {
      throw new BadRequestException('Only group admins can change admin rights');
    }

    const targetPart = room.participants.find((p) => p.userId === targetUserId);
    if (!targetPart) throw new BadRequestException('Member not found in room');

    return this.prisma.participant.update({
      where: { id: targetPart.id },
      data: { isAdmin: !targetPart.isAdmin },
    });
  }

  async createCallSession(roomId: number, callerId: number, callerName: string) {
    return this.prisma.callSession.create({
      data: {
        roomId,
        callerId,
        callerName,
        participants: JSON.stringify([{ id: callerId, name: callerName, joinedAt: new Date().toISOString() }]),
        status: 'initiated',
      },
    });
  }

  async updateCallSession(sessionId: number, duration: number, status: string, participantName?: string, participantId?: number) {
    const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
    let participants = session ? JSON.parse(session.participants || '[]') : [];

    // Add new participant if joining
    if (participantId && participantName && status === 'active') {
      const alreadyIn = participants.some((p: any) => p.id === participantId);
      if (!alreadyIn) {
        participants.push({ id: participantId, name: participantName, joinedAt: new Date().toISOString() });
      }
    }

    const endedAt = (status === 'completed' || status === 'ended' || status === 'missed') ? new Date() : undefined;

    return this.prisma.callSession.update({
      where: { id: sessionId },
      data: { 
        duration, 
        status,
        participants: JSON.stringify(participants),
        ...(endedAt ? { endedAt } : {}),
      },
    });
  }

  async getCallHistory(roomId: number) {
    const calls = await this.prisma.callSession.findMany({
      where: { roomId },
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

  async toggleReaction(userId: number, messageId: number, emoji: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: {
        userId_messageId_emoji: {
          userId,
          messageId,
          emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.reaction.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.reaction.create({
        data: {
          userId,
          messageId,
          emoji,
        },
      });
    }

    return this.prisma.reaction.findMany({
      where: { messageId },
    });
  }

  async togglePinMessage(messageId: number) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg) throw new Error('Message not found');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !msg.isPinned },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getPinnedMessages(roomId: number) {
    return this.prisma.message.findMany({
      where: { roomId, isPinned: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSharedFiles(roomId: number) {
    return this.prisma.attachment.findMany({
      where: {
        message: {
          roomId,
        },
      },
      include: {
        message: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async deleteRoom(adminUserId: number, roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new BadRequestException('Room not found');
    if (!room.isGroup) throw new BadRequestException('Cannot delete DMs');

    const requester = room.participants.find((p) => p.userId === adminUserId);
    if (!requester || !requester.isAdmin) {
      throw new BadRequestException('Only group admins can delete the group');
    }

    await this.prisma.room.delete({
      where: { id: roomId },
    });
    return { success: true };
  }

  async updateRoomName(adminUserId: number, roomId: number, name: string, avatarUrl?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new BadRequestException('Room not found');
    if (!room.isGroup) throw new BadRequestException('Cannot rename DMs');

    const requester = room.participants.find((p) => p.userId === adminUserId);
    if (!requester || !requester.isAdmin) {
      throw new BadRequestException('Only group admins can rename the group');
    }

    const updateData: any = { name };
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    return this.prisma.room.update({
      where: { id: roomId },
      data: updateData,
      include: {
        participants: {
          include: { user: true },
        },
      },
    });
  }

  async clearChatHistory(roomId: number) {
    await this.prisma.message.deleteMany({
      where: { roomId },
    });
    return { success: true };
  }

  async leaveRoom(userId: number, roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new BadRequestException('Room not found');
    if (!room.isGroup) throw new BadRequestException('Cannot leave direct messages');

    const participant = room.participants.find((p) => p.userId === userId);
    if (!participant) throw new BadRequestException('You are not a member of this group');

    const otherParticipants = room.participants.filter((p) => p.userId !== userId);
    
    await this.prisma.participant.delete({
      where: { id: participant.id },
    });

    if (otherParticipants.length === 0) {
      // No members left, delete the room
      await this.prisma.room.delete({
        where: { id: roomId },
      });
      return { deleted: true };
    } else if (participant.isAdmin) {
      // If leaving user was admin, check if there are other admins left
      const hasOtherAdmins = otherParticipants.some((p) => p.isAdmin);
      if (!hasOtherAdmins) {
        // Promote the first participant to admin
        await this.prisma.participant.update({
          where: { id: otherParticipants[0].id },
          data: { isAdmin: true },
        });
      }
    }

    return { deleted: false };
  }

  async exportBackup(userId: number) {
    const participants = await this.prisma.participant.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true }
                }
              }
            },
            messages: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                },
                attachments: true
              }
            }
          }
        }
      }
    });

    const backupData = participants.map((p) => {
      const room = p.room;
      return {
        roomName: room.name,
        isGroup: room.isGroup,
        avatarUrl: room.avatarUrl,
        dmStatus: room.dmStatus,
        dmRequesterId: room.dmRequesterId,
        participants: room.participants.map((part) => ({
          name: part.user.name,
          email: part.user.email,
          avatarUrl: part.user.avatarUrl,
          isAdmin: part.isAdmin
        })),
        messages: room.messages.map((m) => ({
          content: m.content,
          senderName: m.user.name,
          senderEmail: m.user.email,
          createdAt: m.createdAt,
          isPinned: m.isPinned,
          isEdited: m.isEdited,
          isDeleted: m.isDeleted,
          attachments: m.attachments.map((att) => ({
            fileName: att.fileName,
            fileType: att.fileType,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize
          }))
        }))
      };
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      version: '1.0',
      exportedAt: new Date(),
      userEmail: user?.email,
      backupData
    };
  }

  async importBackup(userId: number, backup: any) {
    if (!backup || backup.version !== '1.0' || !Array.isArray(backup.backupData)) {
      throw new BadRequestException('Invalid backup format');
    }

    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new BadRequestException('User not found');

    let roomsImported = 0;
    let messagesImported = 0;

    for (const r of backup.backupData) {
      if (r.isGroup) {
        // Group Room
        let room = await this.prisma.room.findFirst({
          where: {
            name: r.roomName,
            isGroup: true,
            participants: {
              some: { userId }
            }
          }
        });

        if (!room) {
          room = await this.prisma.room.create({
            data: {
              name: r.roomName,
              isGroup: true,
              avatarUrl: r.avatarUrl,
            }
          });
          await this.prisma.participant.create({
            data: { roomId: room.id, userId, isAdmin: true }
          });
          roomsImported++;
        }

        for (const p of r.participants) {
          const matchedUser = await this.prisma.user.findUnique({ where: { email: p.email } });
          if (matchedUser && matchedUser.id !== userId) {
            const isPart = await this.prisma.participant.findUnique({
              where: { userId_roomId: { userId: matchedUser.id, roomId: room.id } }
            });
            if (!isPart) {
              await this.prisma.participant.create({
                data: { roomId: room.id, userId: matchedUser.id, isAdmin: p.isAdmin || false }
              });
            }
          }
        }

        for (const m of r.messages) {
          let senderId = userId;
          const matchedSender = await this.prisma.user.findUnique({ where: { email: m.senderEmail } });
          if (matchedSender) {
            senderId = matchedSender.id;
          }

          const exists = await this.prisma.message.findFirst({
            where: {
              roomId: room.id,
              userId: senderId,
              content: m.content,
              createdAt: new Date(m.createdAt)
            }
          });

          if (!exists) {
            const newMsg = await this.prisma.message.create({
              data: {
                roomId: room.id,
                userId: senderId,
                content: m.content,
                createdAt: new Date(m.createdAt),
                isPinned: m.isPinned || false,
                isEdited: m.isEdited || false,
                isDeleted: m.isDeleted || false,
              }
            });

            if (Array.isArray(m.attachments)) {
              for (const att of m.attachments) {
                await this.prisma.attachment.create({
                  data: {
                    messageId: newMsg.id,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    fileUrl: att.fileUrl,
                    fileSize: att.fileSize
                  }
                });
              }
            }
            messagesImported++;
          }
        }

      } else {
        // DM Room
        const otherPartBackup = r.participants.find((p: any) => p.email !== currentUser.email);
        if (!otherPartBackup) continue;

        const otherUser = await this.prisma.user.findUnique({ where: { email: otherPartBackup.email } });
        if (!otherUser) continue;

        let room = await this.prisma.room.findFirst({
          where: {
            isGroup: false,
            participants: {
              some: { userId }
            },
            AND: {
              participants: {
                some: { userId: otherUser.id }
              }
            }
          }
        });

        if (!room) {
          room = await this.prisma.room.create({
            data: {
              isGroup: false,
              dmStatus: r.dmStatus || 'accepted',
              dmRequesterId: r.dmRequesterId ? (r.dmRequesterId === 1 ? userId : otherUser.id) : userId
            }
          });
          await this.prisma.participant.create({ data: { roomId: room.id, userId } });
          await this.prisma.participant.create({ data: { roomId: room.id, userId: otherUser.id } });
          roomsImported++;
        }

        for (const m of r.messages) {
          let senderId = userId;
          if (m.senderEmail === otherUser.email) {
            senderId = otherUser.id;
          }

          const exists = await this.prisma.message.findFirst({
            where: {
              roomId: room.id,
              userId: senderId,
              content: m.content,
              createdAt: new Date(m.createdAt)
            }
          });

          if (!exists) {
            const newMsg = await this.prisma.message.create({
              data: {
                roomId: room.id,
                userId: senderId,
                content: m.content,
                createdAt: new Date(m.createdAt),
                isPinned: m.isPinned || false,
                isEdited: m.isEdited || false,
                isDeleted: m.isDeleted || false,
              }
            });

            if (Array.isArray(m.attachments)) {
              for (const att of m.attachments) {
                await this.prisma.attachment.create({
                  data: {
                    messageId: newMsg.id,
                    fileName: att.fileName,
                    fileType: att.fileType,
                    fileUrl: att.fileUrl,
                    fileSize: att.fileSize
                  }
                });
              }
            }
            messagesImported++;
          }
        }
      }
    }

    return { success: true, roomsImported, messagesImported };
  }
}
