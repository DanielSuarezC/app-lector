import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';

import { SalesService } from './sales.service';
import { Sale } from './sale.entity';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { Product, ItemType, SoldBy } from '../products/product.entity';
import { MovementType } from '../inventory/inventory-movement.entity';

const makeSaleRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

const mockProductsService = () => ({
  findOne: jest.fn(),
});

const mockInventoryService = () => ({
  adjustStock: jest.fn(),
});

describe('SalesService', () => {
  let service: SalesService;
  let saleRepo: ReturnType<typeof makeSaleRepo>;
  let productsService: ReturnType<typeof mockProductsService>;
  let inventoryService: ReturnType<typeof mockInventoryService>;

  const product: Partial<Product> = {
    id: 'prod-uuid',
    systemCode: 'P12345678',
    barcode: '7700999012345',
    name: 'Lapicero BIC',
    salePrice: 1000,
    stock: 10,
    trackInventory: true,
    category: 'Lapiceros',
    type: ItemType.PRODUCT,
    soldBy: SoldBy.UNIT,
  };

  const saleEntity: Partial<Sale> = {
    id: 'sale-uuid',
    transactionNumber: 'CR20260529-123456',
    items: [
      {
        productId: 'prod-uuid',
        systemCode: 'P12345678',
        barcode: '7700999012345',
        productName: 'Lapicero BIC',
        category: 'Lapiceros',
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
      },
    ],
    subtotal: 2000,
    discount: 0,
    total: 2000,
    paymentMethod: 'cash',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getRepositoryToken(Sale), useFactory: makeSaleRepo },
        { provide: ProductsService, useFactory: mockProductsService },
        { provide: InventoryService, useFactory: mockInventoryService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    saleRepo = module.get(getRepositoryToken(Sale));
    productsService = module.get(ProductsService);
    inventoryService = module.get(InventoryService);
  });

  describe('create', () => {
    it('crea una venta y descuenta inventario', async () => {
      productsService.findOne.mockResolvedValue(product);
      inventoryService.adjustStock.mockResolvedValue({});
      saleRepo.create.mockReturnValue(saleEntity);
      saleRepo.save.mockResolvedValue(saleEntity);

      const result = await service.create({
        items: [{ productId: 'prod-uuid', quantity: 2 }],
        paymentMethod: 'cash',
      });

      expect(result).toEqual(saleEntity);
      expect(inventoryService.adjustStock).toHaveBeenCalledWith(
        'prod-uuid',
        { quantity: -2, type: MovementType.SALE },
        'pos',
      );
    });

    it('lanza BadRequestException cuando el stock es insuficiente', async () => {
      productsService.findOne.mockResolvedValue({ ...product, stock: 1 });

      await expect(
        service.create({
          items: [{ productId: 'prod-uuid', quantity: 5 }],
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(inventoryService.adjustStock).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException cuando el descuento supera el subtotal', async () => {
      productsService.findOne.mockResolvedValue(product);

      await expect(
        service.create({
          items: [{ productId: 'prod-uuid', quantity: 1 }],
          paymentMethod: 'cash',
          discount: 5000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('acepta quickItems sin afectar el inventario de productos', async () => {
      inventoryService.adjustStock.mockResolvedValue({});
      saleRepo.create.mockReturnValue({ ...saleEntity, total: 2500 });
      saleRepo.save.mockResolvedValue({ ...saleEntity, total: 2500 });

      const result = await service.create({
        items: [],
        quickItems: [{ name: 'Impresión Carta', unitPrice: 2500, quantity: 1 }],
        paymentMethod: 'nequi',
      });

      expect(result.total).toBe(2500);
      expect(inventoryService.adjustStock).not.toHaveBeenCalled();
    });

    it('no descuenta inventario si trackInventory es false', async () => {
      productsService.findOne.mockResolvedValue({ ...product, trackInventory: false });
      saleRepo.create.mockReturnValue(saleEntity);
      saleRepo.save.mockResolvedValue(saleEntity);

      await service.create({
        items: [{ productId: 'prod-uuid', quantity: 1 }],
        paymentMethod: 'cash',
      });

      expect(inventoryService.adjustStock).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('retorna las últimas 200 ventas cuando no hay filtro de fechas', async () => {
      saleRepo.find.mockResolvedValue([saleEntity]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(saleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });

    it('filtra por rango de fechas cuando se proveen', async () => {
      saleRepo.find.mockResolvedValue([saleEntity]);
      const result = await service.findAll('2026-05-01', '2026-05-31');
      expect(result).toHaveLength(1);
    });
  });

  describe('getDailySummary', () => {
    it('retorna el resumen del día con total y conteo', async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      saleRepo.find.mockResolvedValue([
        { ...saleEntity, total: 1000, createdAt: today },
        { ...saleEntity, total: 2000, createdAt: today },
      ]);

      const result = await service.getDailySummary();
      expect(result.count).toBe(2);
      expect(result.total).toBe(3000);
    });

    it('retorna ceros cuando no hay ventas hoy', async () => {
      saleRepo.find.mockResolvedValue([]);
      const result = await service.getDailySummary();
      expect(result.count).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getSalesSummary', () => {
    it('agrupa por método de pago y categoría', async () => {
      const today = new Date();
      saleRepo.find.mockResolvedValue([
        {
          ...saleEntity,
          total: 2000,
          paymentMethod: 'cash',
          createdAt: today,
        },
      ]);

      const result = await service.getSalesSummary();
      expect(result.totalRevenue).toBe(2000);
      expect(result.totalTransactions).toBe(1);
      expect(result.byPaymentMethod['cash']).toBeDefined();
      expect(result.byPaymentMethod['cash'].count).toBe(1);
    });
  });
});
