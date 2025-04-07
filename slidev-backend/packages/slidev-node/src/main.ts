import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { requestId } from './middlewares/requestId';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 从配置服务中获取端口
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  app.use(requestId);
  await app.listen(port);
  console.log(`服务已启动: http://localhost:${port}`);
}
bootstrap();
