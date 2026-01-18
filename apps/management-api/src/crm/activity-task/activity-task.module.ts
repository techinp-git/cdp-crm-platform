import { Module } from '@nestjs/common';
import { ActivityTaskService } from './activity-task.service';
import { ActivityTaskController } from './activity-task.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityTaskController],
  providers: [ActivityTaskService],
  exports: [ActivityTaskService],
})
export class ActivityTaskModule {}
