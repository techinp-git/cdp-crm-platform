import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventTrackingController } from './event-tracking.controller';
import { EventTrackingService } from './event-tracking.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventTrackingController],
  providers: [EventTrackingService],
  exports: [EventTrackingService],
})
export class EventTrackingModule {}

