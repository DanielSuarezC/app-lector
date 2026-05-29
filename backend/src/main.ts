import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { PaymentMethodsService } from './payment-methods/payment-methods.service';
import { ProductsService } from './products/products.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.CORS_ORIGINS || 'http://localhost:4200').split(',');
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Colina Real IoT API')
    .setDescription('API REST para el sistema IoT de inventario y POS de Impresiones Colina Real')
    .setVersion('2.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Seed medios de pago por defecto si no existen
  const pmService = app.get(PaymentMethodsService);
  await pmService.seed();

  // Poblar system_code en productos existentes que no lo tengan
  const productsService = app.get(ProductsService);
  await productsService.populateMissingSystemCodes();

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);
  console.info(`Backend corriendo en http://localhost:${port}/api`);
  console.info(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
