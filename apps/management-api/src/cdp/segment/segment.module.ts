import { Module } from '@nestjs/common';
import { SegmentService } from './segment.service';
import { SegmentController } from './segment.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SegmentController],
  providers: [SegmentService],
  exports: [SegmentService],
})
export class SegmentModule {}
