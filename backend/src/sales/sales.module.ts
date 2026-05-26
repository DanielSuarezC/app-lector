import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Sale } from './sale.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale]), ProductsModule, InventoryModule],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
