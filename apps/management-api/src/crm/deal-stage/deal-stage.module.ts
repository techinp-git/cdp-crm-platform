import { Module } from '@nestjs/common';
import { DealStageService } from './deal-stage.service';
import { DealStageController } from './deal-stage.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DealStageController],
  providers: [DealStageService],
  exports: [DealStageService],
})
export class DealStageModule {}
