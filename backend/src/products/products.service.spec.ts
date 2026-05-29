import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { ProductsService } from './products.service';
import { Product, ItemType, SoldBy } from './product.entity';
import { ProductVariant } from './variant.entity';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
});

const makeRepo = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
});

const makeVariantRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: ReturnType<typeof makeRepo>;
  let variantRepo: ReturnType<typeof makeVariantRepo>;

  const product = {
    id: 'prod-uuid',
    systemCode: 'P12345678',
    barcode: null,
    name: 'Lapicero BIC Azul',
    costPrice: 500,
    salePrice: 1000,
    stock: 20,
    minStock: 5,
    active: true,
    trackInventory: true,
    availableForSale: true,
    type: ItemType.PRODUCT,
    soldBy: SoldBy.UNIT,
    variants: [] as ProductVariant[],
    createdAt: new Date(),
    updatedAt: new Date(),
    generateSystemCode: jest.fn(),
  } as unknown as Product;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useFactory: makeRepo },
        { provide: getRepositoryToken(ProductVariant), useFactory: makeVariantRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repo = module.get(getRepositoryToken(Product));
    variantRepo = module.get(getRepositoryToken(ProductVariant));
  });

  describe('create', () => {
    it('crea un producto exitosamente', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.create.mockReturnValue({ ...product });
      repo.save.mockResolvedValue(product);
      repo.findOne.mockResolvedValue(product);

      const result = await service.create({ name: 'Lapicero BIC Azul', salePrice: 1000 });
      expect(result).toEqual(product);
    });

    it('lanza BadRequestException cuando costo > precio de venta', async () => {
      await expect(
        service.create({ name: 'X', salePrice: 100, costPrice: 500 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException cuando el barcode ya existe', async () => {
      repo.findOneBy.mockResolvedValue({ id: 'otro-prod' });
      await expect(
        service.create({ name: 'X', salePrice: 500, barcode: '7700999012345' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('retorna todos los productos activos', async () => {
      repo.find.mockResolvedValue([product]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(product);
    });
  });

  describe('findLowStock', () => {
    it('usa el query builder para encontrar productos con bajo stock', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([{ ...product, stock: 2 }]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findLowStock();
      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('retorna un producto por id', async () => {
      repo.findOne.mockResolvedValue(product);
      expect(await service.findOne('prod-uuid')).toEqual(product);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByBarcode', () => {
    it('retorna producto por barcode', async () => {
      const withBarcode = { ...product, barcode: '7700999012345' };
      repo.findOne.mockResolvedValue(withBarcode);
      expect(await service.findByBarcode('7700999012345')).toEqual(withBarcode);
    });

    it('lanza NotFoundException si el barcode no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findByBarcode('0000000')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySystemCode', () => {
    it('retorna producto por código de sistema', async () => {
      repo.findOne.mockResolvedValue(product);
      expect(await service.findBySystemCode('P12345678')).toEqual(product);
    });

    it('lanza NotFoundException si el código no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findBySystemCode('NOEXISTE')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchByName', () => {
    it('retorna array vacío para query en blanco', async () => {
      expect(await service.searchByName('')).toEqual([]);
      expect(await service.searchByName('   ')).toEqual([]);
    });

    it('usa el query builder para búsquedas por nombre', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([product]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchByName('Lapicero');
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('actualiza los campos de un producto', async () => {
      const updated = { ...product, name: 'Lapicero BIC Rojo' };
      repo.findOne
        .mockResolvedValueOnce({ ...product }) // findOne(id) al inicio: copia para no mutar
        .mockResolvedValueOnce(updated);       // findOne(id) al final
      repo.save.mockResolvedValue(updated);

      const result = await service.update('prod-uuid', { name: 'Lapicero BIC Rojo' });
      expect(result.name).toBe('Lapicero BIC Rojo');
    });

    it('lanza BadRequestException cuando los nuevos precios son inválidos', async () => {
      repo.findOne.mockResolvedValue({ ...product });
      await expect(
        service.update('prod-uuid', { costPrice: 5000, salePrice: 100 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('hace soft-delete de un producto', async () => {
      repo.findOne.mockResolvedValue({ ...product });
      repo.save.mockResolvedValue({ ...product, active: false });

      await service.remove('prod-uuid');
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    });
  });

  describe('generateBarcode', () => {
    it('retorna el producto si ya tiene barcode', async () => {
      const withBarcode = { ...product, barcode: '7700000012341' };
      repo.findOne.mockResolvedValue(withBarcode);

      const result = await service.generateBarcode('prod-uuid');
      expect(result.barcode).toBe('7700000012341');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('genera y asigna un barcode EAN-13 si no tiene', async () => {
      repo.findOne.mockResolvedValue({ ...product, barcode: null });
      repo.findOneBy.mockResolvedValue(null); // no hay colisión
      repo.save.mockImplementation((p: unknown) => Promise.resolve({ ...(p as Product) }));

      const result = await service.generateBarcode('prod-uuid');
      expect(result.barcode).toBeTruthy();
      expect(result.barcode).toHaveLength(13);
    });
  });
});
