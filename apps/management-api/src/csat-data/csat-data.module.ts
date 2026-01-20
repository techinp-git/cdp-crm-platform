import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CsatDataController } from './csat-data.controller';
import { CsatDataService } from './csat-data.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [CsatDataController],
  providers: [CsatDataService],
  exports: [CsatDataService],
})
export class CsatDataModule {}

