import { Module } from '@nestjs/common';
import { LineEventService } from './line-event.service';
import { LineEventController } from './line-event.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatAutoMessagerModule } from '../chat-auto-messager/chat-auto-messager.module';

@Module({
  imports: [PrismaModule, ChatAutoMessagerModule],
  controllers: [LineEventController],
  providers: [LineEventService],
  exports: [LineEventService],
})
export class LineEventModule {}
