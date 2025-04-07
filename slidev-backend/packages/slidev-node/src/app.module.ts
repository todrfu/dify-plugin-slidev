import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlidevModule } from './slidev/slidev.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 让配置在整个应用中可用
      envFilePath: '.env',
    }),
    SlidevModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
