import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodEntity } from './payment-method.entity';

const makeRepo = () => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let repo: ReturnType<typeof makeRepo>;

  const pm: PaymentMethodEntity = {
    id: 'pm-uuid',
    key: 'cash',
    name: 'Efectivo',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: getRepositoryToken(PaymentMethodEntity), useFactory: makeRepo },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
    repo = module.get(getRepositoryToken(PaymentMethodEntity));
  });

  describe('create', () => {
    it('crea un medio de pago cuando clave y nombre son únicos', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.create.mockReturnValue(pm);
      repo.save.mockResolvedValue(pm);

      const result = await service.create({ key: 'cash', name: 'Efectivo' });
      expect(result).toEqual(pm);
    });

    it('lanza ConflictException cuando la clave ya existe', async () => {
      repo.findOneBy.mockResolvedValueOnce(pm); // key conflict
      await expect(service.create({ key: 'cash', name: 'Otro' })).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException cuando el nombre ya existe', async () => {
      repo.findOneBy
        .mockResolvedValueOnce(null)  // key check: ok
        .mockResolvedValueOnce(pm);  // name check: conflict
      await expect(service.create({ key: 'otro-key', name: 'Efectivo' })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('retorna los medios de pago activos', async () => {
      repo.find.mockResolvedValue([pm]);
      const result = await service.findAll();
      expect(result).toEqual([pm]);
      expect(repo.find).toHaveBeenCalledWith({ where: { active: true }, order: { name: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('retorna un medio de pago por id', async () => {
      repo.findOneBy.mockResolvedValue(pm);
      expect(await service.findOne('pm-uuid')).toEqual(pm);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza un medio de pago', async () => {
      const updated = { ...pm, name: 'Dinero en efectivo' };
      repo.findOneBy
        .mockResolvedValueOnce(pm)    // findOne(id)
        .mockResolvedValueOnce(null); // key uniqueness check
      repo.save.mockResolvedValue(updated);

      const result = await service.update('pm-uuid', { name: 'Dinero en efectivo' });
      expect(result.name).toBe('Dinero en efectivo');
    });

    it('lanza ConflictException si la nueva clave ya existe', async () => {
      const other = { ...pm, id: 'pm-uuid-2', key: 'transfer' };
      repo.findOneBy
        .mockResolvedValueOnce(pm)     // findOne(id)
        .mockResolvedValueOnce(other); // key conflict
      await expect(service.update('pm-uuid', { key: 'transfer' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('hace soft-delete de un medio de pago', async () => {
      repo.findOneBy.mockResolvedValue({ ...pm });
      repo.save.mockResolvedValue({ ...pm, active: false });

      await service.remove('pm-uuid');
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    });
  });

  describe('seed', () => {
    it('crea los medios de pago por defecto si no existen', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.create.mockImplementation((data: Partial<PaymentMethodEntity>) => ({ ...data }));
      repo.save.mockResolvedValue({});

      await service.seed();

      // 4 medios de pago por defecto: cash, card, transfer, nequi
      expect(repo.save).toHaveBeenCalledTimes(4);
    });

    it('no duplica medios de pago que ya existen', async () => {
      repo.findOneBy.mockResolvedValue(pm); // todos ya existen

      await service.seed();

      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
