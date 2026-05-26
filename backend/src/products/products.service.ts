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
    const existing = await this.repo.findOneBy({ barcode: dto.barcode });
    if (existing) {
      throw new ConflictException(`Ya existe un producto con barcode '${dto.barcode}'`);
    }
    const product = this.repo.create({
      ...dto,
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
}
