import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailContentController } from './email-content.controller';
import { EmailContentService } from './email-content.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmailContentController],
  providers: [EmailContentService],
  exports: [EmailContentService],
})
export class EmailContentModule {}

