import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatAutoMessagerController } from './chat-auto-messager.controller';
import { ChatAutoMessagerService } from './chat-auto-messager.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChatAutoMessagerController],
  providers: [ChatAutoMessagerService],
  exports: [ChatAutoMessagerService],
})
export class ChatAutoMessagerModule {}

