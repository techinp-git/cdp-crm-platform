import { Module } from '@nestjs/common';
import { LineFollowerService } from './line-follower.service';
import { LineFollowerController } from './line-follower.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LineFollowerController],
  providers: [LineFollowerService],
  exports: [LineFollowerService],
})
export class LineFollowerModule {}
