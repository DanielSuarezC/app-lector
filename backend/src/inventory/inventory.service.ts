import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InventoryMovement, MovementType } from './inventory-movement.entity';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    private readonly productsService: ProductsService,
  ) {}

  async adjustStock(
    productId: string,
    dto: AdjustStockDto,
    source = 'manual',
  ): Promise<InventoryMovement> {
    const product = await this.productsService.findOne(productId);
    const stockBefore = product.stock;
    const stockAfter = stockBefore + dto.quantity;

    if (stockAfter < 0) {
      throw new BadRequestException(
        `Stock insuficiente: tiene ${stockBefore}, intenta mover ${dto.quantity}`,
      );
    }

    await this.productsService.update(productId, { stock: stockAfter });

    const movement = this.movementRepo.create({
      productId,
      type: dto.type,
      quantity: dto.quantity,
      stockBefore,
      stockAfter,
      source,
      notes: dto.notes,
    });
    return this.movementRepo.save(movement);
  }

  getMovements(productId?: string): Promise<InventoryMovement[]> {
    const query = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'p')
      .orderBy('m.createdAt', 'DESC')
      .take(200);

    if (productId) {
      query.where('m.productId = :productId', { productId });
    }
    return query.getMany();
  }
}
