import { Module } from '@nestjs/common';
import { SlidevModule } from './slidev/slidev.module';

@Module({
  imports: [SlidevModule],
  controllers: [],
  providers: [],
})
export class AppModule {} 