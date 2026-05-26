import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryMovement } from './inventory-movement.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryMovement]), ProductsModule],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
