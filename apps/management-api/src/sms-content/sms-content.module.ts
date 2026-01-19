import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsContentController } from './sms-content.controller';
import { SmsContentService } from './sms-content.service';

@Module({
  imports: [PrismaModule],
  controllers: [SmsContentController],
  providers: [SmsContentService],
  exports: [SmsContentService],
})
export class SmsContentModule {}

