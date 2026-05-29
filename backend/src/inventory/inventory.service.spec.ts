import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';

import { InventoryService } from './inventory.service';
import { InventoryMovement, MovementType } from './inventory-movement.entity';
import { ProductsService } from '../products/products.service';
import { Product, ItemType, SoldBy } from '../products/product.entity';

const makeQb = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
});

const makeMovementRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
});

const mockProductsService = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let movementRepo: ReturnType<typeof makeMovementRepo>;
  let productsService: ReturnType<typeof mockProductsService>;

  const product: Partial<Product> = {
    id: 'prod-uuid',
    name: 'Lapicero BIC',
    stock: 10,
    trackInventory: true,
    type: ItemType.PRODUCT,
    soldBy: SoldBy.UNIT,
  };

  const movement: Partial<InventoryMovement> = {
    id: 'mov-uuid',
    productId: 'prod-uuid',
    type: MovementType.RECEPTION,
    quantity: 5,
    stockBefore: 10,
    stockAfter: 15,
    source: 'manual',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryMovement), useFactory: makeMovementRepo },
        { provide: ProductsService, useFactory: mockProductsService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    movementRepo = module.get(getRepositoryToken(InventoryMovement));
    productsService = module.get(ProductsService);
  });

  describe('adjustStock', () => {
    it('registra una entrada de stock exitosamente', async () => {
      productsService.findOne.mockResolvedValue(product);
      productsService.update.mockResolvedValue({ ...product, stock: 15 });
      movementRepo.create.mockReturnValue(movement);
      movementRepo.save.mockResolvedValue(movement);

      const result = await service.adjustStock(
        'prod-uuid',
        { quantity: 5, type: MovementType.RECEPTION },
        'manual',
      );

      expect(result).toEqual(movement);
      expect(productsService.update).toHaveBeenCalledWith('prod-uuid', { stock: 15 });
    });

    it('registra una salida de stock exitosamente', async () => {
      productsService.findOne.mockResolvedValue(product);
      productsService.update.mockResolvedValue({ ...product, stock: 7 });
      movementRepo.create.mockReturnValue({ ...movement, quantity: -3, stockAfter: 7 });
      movementRepo.save.mockResolvedValue({ ...movement, quantity: -3, stockAfter: 7 });

      const result = await service.adjustStock(
        'prod-uuid',
        { quantity: -3, type: MovementType.ADJUSTMENT },
      );

      expect(productsService.update).toHaveBeenCalledWith('prod-uuid', { stock: 7 });
      expect(result.stockAfter).toBe(7);
    });

    it('lanza BadRequestException cuando el stock resultante sería negativo', async () => {
      productsService.findOne.mockResolvedValue({ ...product, stock: 5 });

      await expect(
        service.adjustStock('prod-uuid', { quantity: -10, type: MovementType.ADJUSTMENT }),
      ).rejects.toThrow(BadRequestException);

      expect(productsService.update).not.toHaveBeenCalled();
    });

    it('usa source "manual" por defecto', async () => {
      productsService.findOne.mockResolvedValue(product);
      productsService.update.mockResolvedValue({});
      movementRepo.create.mockReturnValue({ ...movement, source: 'manual' });
      movementRepo.save.mockResolvedValue({ ...movement, source: 'manual' });

      await service.adjustStock('prod-uuid', { quantity: 1, type: MovementType.RECEPTION });
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'manual' }),
      );
    });
  });

  describe('getMovements', () => {
    it('retorna todos los movimientos cuando no hay filtro', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([movement]);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMovements();
      expect(result).toHaveLength(1);
      expect(qb.where).not.toHaveBeenCalled();
    });

    it('filtra por productId cuando se provee', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([movement]);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getMovements('prod-uuid');
      expect(qb.where).toHaveBeenCalledWith(
        'm.productId = :productId',
        { productId: 'prod-uuid' },
      );
    });
  });
});
