import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatCenterController } from './chat-center.controller';
import { ChatCenterService } from './chat-center.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChatCenterController],
  providers: [ChatCenterService],
  exports: [ChatCenterService],
})
export class ChatCenterModule {}

