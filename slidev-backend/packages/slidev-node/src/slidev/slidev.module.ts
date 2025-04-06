import { Module } from '@nestjs/common';
import { SlidevController } from './slidev.controller';
import { SlidevService } from './slidev.service';

@Module({
  controllers: [SlidevController],
  providers: [SlidevService],
})
export class SlidevModule {} 