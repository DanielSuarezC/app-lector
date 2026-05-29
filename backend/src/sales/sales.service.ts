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
      if (product.trackInventory && (product.stock ?? 0) < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para '${product.name}': tiene ${product.stock ?? 0}, vende ${item.quantity}`,
        );
      }
      const itemSubtotal = Number(product.salePrice) * item.quantity;
      itemSnapshots.push({
        productId: product.id!,
        systemCode: product.systemCode,
        barcode: product.barcode ?? '',
        productName: product.name!,
        category: product.category ?? '',
        quantity: item.quantity,
        unitPrice: Number(product.salePrice),
        subtotal: itemSubtotal,
      });
      subtotal += itemSubtotal;
    }

    if (dto.quickItems?.length) {
      for (const qi of dto.quickItems) {
        const itemSubtotal = qi.unitPrice * qi.quantity;
        itemSnapshots.push({
          productId: 'quick-service',
          barcode: '',
          productName: qi.name,
          category: qi.category ?? 'Servicios',
          quantity: qi.quantity,
          unitPrice: qi.unitPrice,
          subtotal: itemSubtotal,
        });
        subtotal += itemSubtotal;
      }
    }

    const discount = dto.discount ?? 0;
    const total = subtotal - discount;

    if (total < 0) {
      throw new BadRequestException('El descuento no puede superar el subtotal');
    }

    for (const item of dto.items) {
      const product = await this.productsService.findOne(item.productId);
      if (product.trackInventory) {
        await this.inventoryService.adjustStock(
          item.productId,
          { quantity: -item.quantity, type: MovementType.SALE },
          'pos',
        );
      }
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
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      return this.saleRepo.find({
        where: { createdAt: Between(fromDate, toDate) },
        order: { createdAt: 'DESC' },
      });
    }
    return this.saleRepo.find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  async getDailySummary(): Promise<{ date: string; total: number; count: number }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const sales = await this.saleRepo.find({ where: { createdAt: Between(start, end) } });
    return {
      date: start.toISOString().split('T')[0],
      total: sales.reduce((acc, s) => acc + Number(s.total), 0),
      count: sales.length,
    };
  }

  async getSalesSummary(from?: string, to?: string): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    byPaymentMethod: Record<string, { count: number; total: number }>;
    byCategory: Record<string, { count: number; total: number }>;
    dailySeries: Array<{ date: string; total: number; count: number }>;
  }> {
    const sales = await this.findAll(from, to);

    const byPaymentMethod: Record<string, { count: number; total: number }> = {};
    const byCategory: Record<string, { count: number; total: number }> = {};
    const dailyMap: Record<string, { total: number; count: number }> = {};

    for (const sale of sales) {
      const pm = sale.paymentMethod;
      if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { count: 0, total: 0 };
      byPaymentMethod[pm].count++;
      byPaymentMethod[pm].total += Number(sale.total);

      const day = sale.createdAt.toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { total: 0, count: 0 };
      dailyMap[day].total += Number(sale.total);
      dailyMap[day].count++;

      for (const item of sale.items) {
        const cat = item.category ?? 'Sin categoría';
        if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
        byCategory[cat].count += item.quantity;
        byCategory[cat].total += item.subtotal;
      }
    }

    const dailySeries = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue: sales.reduce((acc, s) => acc + Number(s.total), 0),
      totalTransactions: sales.length,
      byPaymentMethod,
      byCategory,
      dailySeries,
    };
  }
}
