import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.repo.findOneBy({ name: dto.name });
    if (existing) {
      throw new ConflictException(`Ya existe una categoría con nombre '${dto.name}'`);
    }
    const cat = this.repo.create({ ...dto, active: true });
    return this.repo.save(cat);
  }

  findAll(): Promise<Category[]> {
    return this.repo.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  search(q: string): Promise<Category[]> {
    if (!q || q.trim().length === 0) return this.findAll();
    return this.repo
      .createQueryBuilder('c')
      .where('c.active = true AND LOWER(c.name) LIKE LOWER(:q)', { q: `%${q.trim()}%` })
      .orderBy('c.name', 'ASC')
      .take(20)
      .getMany();
  }

  async findOne(id: string): Promise<Category> {
    const cat = await this.repo.findOneBy({ id });
    if (!cat) throw new NotFoundException(`Categoría '${id}' no encontrada`);
    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.findOne(id);
    if (dto.name && dto.name !== cat.name) {
      const existing = await this.repo.findOneBy({ name: dto.name });
      if (existing) throw new ConflictException(`Ya existe una categoría con nombre '${dto.name}'`);
    }
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findOne(id);
    cat.active = false;
    await this.repo.save(cat);
  }
}
