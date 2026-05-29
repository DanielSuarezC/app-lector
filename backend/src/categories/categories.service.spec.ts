import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
});

const makeRepo = () => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: ReturnType<typeof makeRepo>;

  const cat: Category = {
    id: 'uuid-1',
    name: 'Lapiceros',
    description: 'Desc',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useFactory: makeRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repo = module.get(getRepositoryToken(Category));
  });

  describe('create', () => {
    it('crea una categoría cuando el nombre es único', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.create.mockReturnValue(cat);
      repo.save.mockResolvedValue(cat);

      const result = await service.create({ name: 'Lapiceros' });
      expect(result).toEqual(cat);
      expect(repo.findOneBy).toHaveBeenCalledWith({ name: 'Lapiceros' });
    });

    it('lanza ConflictException cuando el nombre ya existe', async () => {
      repo.findOneBy.mockResolvedValue(cat);
      await expect(service.create({ name: 'Lapiceros' })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('retorna categorías activas ordenadas por nombre', async () => {
      repo.find.mockResolvedValue([cat]);
      const result = await service.findAll();
      expect(result).toEqual([cat]);
      expect(repo.find).toHaveBeenCalledWith({ where: { active: true }, order: { name: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('retorna una categoría por id', async () => {
      repo.findOneBy.mockResolvedValue(cat);
      expect(await service.findOne('uuid-1')).toEqual(cat);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza una categoría', async () => {
      const updated = { ...cat, name: 'Bolígrafos' };
      repo.findOneBy
        .mockResolvedValueOnce({ ...cat })  // findOne(id): copia para no mutar el fixture
        .mockResolvedValueOnce(null);       // uniqueness check for new name
      repo.save.mockResolvedValue(updated);

      const result = await service.update('uuid-1', { name: 'Bolígrafos' });
      expect(result.name).toBe('Bolígrafos');
    });

    it('lanza ConflictException si el nuevo nombre ya existe', async () => {
      repo.findOneBy
        .mockResolvedValueOnce({ ...cat })                          // findOne(id): copia
        .mockResolvedValueOnce({ ...cat, id: 'uuid-2', name: 'Bolígrafos' }); // conflict
      await expect(service.update('uuid-1', { name: 'Bolígrafos' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('hace soft-delete de una categoría', async () => {
      repo.findOneBy.mockResolvedValue({ ...cat });
      repo.save.mockResolvedValue({ ...cat, active: false });

      await service.remove('uuid-1');
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    });
  });

  describe('search', () => {
    it('retorna todas las categorías si la query está vacía', async () => {
      repo.find.mockResolvedValue([cat]);
      const result = await service.search('');
      expect(result).toEqual([cat]);
    });

    it('usa el query builder para búsquedas no vacías', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([cat]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search('Lapi');
      expect(result).toEqual([cat]);
      expect(qb.where).toHaveBeenCalled();
    });
  });
});
