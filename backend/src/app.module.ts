import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { ScannerModule } from './scanner/scanner.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          url: config.get<string>('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: !isProd,
          migrationsRun: isProd,
          migrations: isProd ? [join(__dirname, 'migrations', '*.js')] : [],
          ssl: isProd ? { rejectUnauthorized: false } : false,
          logging: false,
        };
      },
    }),
    ProductsModule,
    InventoryModule,
    SalesModule,
    ScannerModule,
  ],
})
export class AppModule {}
