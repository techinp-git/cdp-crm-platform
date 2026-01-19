import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessengerContentController } from './messenger-content.controller';
import { MessengerContentService } from './messenger-content.service';

@Module({
  imports: [PrismaModule],
  controllers: [MessengerContentController],
  providers: [MessengerContentService],
  exports: [MessengerContentService],
})
export class MessengerContentModule {}

