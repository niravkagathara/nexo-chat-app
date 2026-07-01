import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { FcmService } from './fcm.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, PrismaService, FcmService],
  exports: [FcmService],
})
export class ChatModule {}
