import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileExplorerController } from './profile-explorer.controller';
import { ProfileExplorerService } from './profile-explorer.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileExplorerController],
  providers: [ProfileExplorerService],
  exports: [ProfileExplorerService],
})
export class ProfileExplorerModule {}

