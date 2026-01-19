import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LineContentController } from './line-content.controller';
import { LineContentService } from './line-content.service';

@Module({
  imports: [PrismaModule],
  controllers: [LineContentController],
  providers: [LineContentService],
  exports: [LineContentService],
})
export class LineContentModule {}

