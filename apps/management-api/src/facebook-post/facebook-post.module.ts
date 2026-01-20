import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FacebookPostController } from './facebook-post.controller';
import { FacebookPostService } from './facebook-post.service';

@Module({
  imports: [PrismaModule],
  controllers: [FacebookPostController],
  providers: [FacebookPostService],
  exports: [FacebookPostService],
})
export class FacebookPostModule {}

