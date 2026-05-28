import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    if (dto.barcode) {
      const existing = await this.repo.findOneBy({ barcode: dto.barcode });
      if (existing) {
        throw new ConflictException(`Ya existe un producto con barcode '${dto.barcode}'`);
      }
    }
    const product = this.repo.create({
      ...dto,
      barcode: dto.barcode ?? null,
      stock: dto.stock ?? 0,
      minStock: dto.minStock ?? 5,
    });
    return this.repo.save(product);
  }

  findAll(): Promise<Product[]> {
    return this.repo.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  findLowStock(): Promise<Product[]> {
    return this.repo
      .createQueryBuilder('p')
      .where('p.stock <= p.minStock AND p.active = true')
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOneBy({ id });
    if (!product) {
      throw new NotFoundException(`Producto con id '${id}' no encontrado`);
    }
    return product;
  }

  async findByBarcode(barcode: string): Promise<Product> {
    const product = await this.repo.findOneBy({ barcode });
    if (!product) {
      throw new NotFoundException(`Producto con barcode '${barcode}' no encontrado`);
    }
    return product;
  }

  searchByName(query: string): Promise<Product[]> {
    if (!query || query.trim().length === 0) {
      return Promise.resolve([]);
    }
    return this.repo
      .createQueryBuilder('p')
      .where('p.active = true AND LOWER(p.name) LIKE LOWER(:q)', { q: `%${query.trim()}%` })
      .orderBy('p.name', 'ASC')
      .take(20)
      .getMany();
  }

  async generateBarcode(id: string): Promise<Product> {
    const product = await this.findOne(id);
    if (product.barcode) {
      return product;
    }

    let barcode: string;
    let attempts = 0;
    do {
      barcode = this.buildEan13();
      attempts++;
    } while ((await this.repo.findOneBy({ barcode })) !== null && attempts < 10);

    product.barcode = barcode;
    return this.repo.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    product.active = false;
    await this.repo.save(product);
  }

  private buildEan13(): string {
    // Prefijo interno: 770 (Colombia) + 000 + 6 dígitos del timestamp
    const ts = Date.now().toString().slice(-6);
    const prefix = `770000${ts}`; // 12 dígitos
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(prefix[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return prefix + check;
  }
}
