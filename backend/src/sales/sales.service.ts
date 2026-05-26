import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { Sale, SaleItemSnapshot } from './sale.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { MovementType } from '../inventory/inventory-movement.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  private generateTransactionNumber(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `CR${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Date.now().toString().slice(-6)}`;
  }

  async create(dto: CreateSaleDto): Promise<Sale> {
    const itemSnapshots: SaleItemSnapshot[] = [];
    let subtotal = 0;

    for (const item of dto.items) {
      const product = await this.productsService.findOne(item.productId);
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para '${product.name}': tiene ${product.stock}, vende ${item.quantity}`,
        );
      }
      const itemSubtotal = Number(product.salePrice) * item.quantity;
      itemSnapshots.push({
        productId: product.id,
        barcode: product.barcode,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.salePrice),
        subtotal: itemSubtotal,
      });
      subtotal += itemSubtotal;
    }

    const discount = dto.discount ?? 0;
    const total = subtotal - discount;

    if (total < 0) {
      throw new BadRequestException('El descuento no puede superar el subtotal');
    }

    // Descontar inventario
    for (const item of dto.items) {
      await this.inventoryService.adjustStock(
        item.productId,
        { quantity: -item.quantity, type: MovementType.SALE },
        'pos',
      );
    }

    const sale = this.saleRepo.create({
      transactionNumber: this.generateTransactionNumber(),
      items: itemSnapshots,
      subtotal,
      discount,
      total,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
    });

    return this.saleRepo.save(sale);
  }

  findAll(from?: string, to?: string): Promise<Sale[]> {
    if (from && to) {
      return this.saleRepo.find({
        where: { createdAt: Between(new Date(from), new Date(to)) },
        order: { createdAt: 'DESC' },
      });
    }
    return this.saleRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async getDailySummary(): Promise<{ date: string; total: number; count: number }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const sales = await this.saleRepo.find({
      where: { createdAt: Between(start, end) },
    });

    return {
      date: start.toISOString().split('T')[0],
      total: sales.reduce((acc, s) => acc + Number(s.total), 0),
      count: sales.length,
    };
  }
}
