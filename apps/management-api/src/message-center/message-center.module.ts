import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessageCenterController } from './message-center.controller';
import { MessageCenterService } from './message-center.service';

@Module({
  imports: [PrismaModule],
  controllers: [MessageCenterController],
  providers: [MessageCenterService],
  exports: [MessageCenterService],
})
export class MessageCenterModule {}

