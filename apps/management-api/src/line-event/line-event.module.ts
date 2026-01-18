import { Module } from '@nestjs/common';
import { LineEventService } from './line-event.service';
import { LineEventController } from './line-event.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LineEventController],
  providers: [LineEventService],
  exports: [LineEventService],
})
export class LineEventModule {}
