import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Serve static files from 'public/uploads'
  const uploadPath = join(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadPath));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Nexo Chat Backend running on http://localhost:${port}`);
}
bootstrap();
