import { Module } from '@nestjs/common';
import { FacebookSyncService } from './facebook-sync.service';
import { FacebookSyncController } from './facebook-sync.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FacebookSyncController],
  providers: [FacebookSyncService],
  exports: [FacebookSyncService],
})
export class FacebookSyncModule {}
