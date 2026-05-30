import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Product, ItemType } from './product.entity';
import { ProductVariant } from './variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  private validatePrices(costPrice: number, salePrice: number) {
    if (salePrice > 0 && costPrice > salePrice) {
      throw new BadRequestException('El costo no puede ser mayor al precio de venta');
    }
  }

  private buildVariantEntity(v: { optionName: string; optionValue: string; costPrice?: number; salePrice?: number; barcode?: string; stock?: number; minStock?: number }, productId: string): ProductVariant {
    const vCost = v.costPrice ?? 0;
    const vSale = v.salePrice ?? 0;
    this.validatePrices(vCost, vSale);
    return this.variantRepo.create({
      optionName: v.optionName,
      optionValue: v.optionValue,
      costPrice: vCost,
      salePrice: vSale,
      barcode: v.barcode ?? undefined,
      stock: v.stock ?? 0,
      minStock: v.minStock ?? 0,
      productId,
    });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const costPrice = dto.costPrice ?? 0;
    const salePrice = dto.salePrice ?? 0;
    this.validatePrices(costPrice, salePrice);

    if (dto.barcode) {
      const existing = await this.repo.findOneBy({ barcode: dto.barcode });
      if (existing) throw new ConflictException(`Ya existe un producto con barcode '${dto.barcode}'`);
    }

    const { variants, ...productData } = dto;
    const product = this.repo.create({
      ...productData,
      costPrice,
      salePrice,
      barcode: dto.barcode ?? null,
      stock: dto.stock ?? 0,
      minStock: dto.minStock ?? 5,
      type: dto.type ?? ItemType.PRODUCT,
      availableForSale: dto.availableForSale ?? true,
      trackInventory: dto.trackInventory ?? true,
    });

    const saved = await this.repo.save(product);

    if (variants && variants.length > 0) {
      const variantEntities = variants.map((v) => this.buildVariantEntity(v, saved.id!));
      await this.variantRepo.save(variantEntities);
    }

    return this.findOne(saved.id!);
  }

  findAll(): Promise<Product[]> {
    return this.repo.find({
      where: { active: true },
      relations: ['variants'],
      order: { name: 'ASC' },
    });
  }

  findLowStock(): Promise<Product[]> {
    return this.repo
      .createQueryBuilder('p')
      .leftJoin('p.variants', 'v')
      .where('p.stock <= p.minStock AND p.active = true AND p.trackInventory = true')
      .groupBy('p.id')
      .having('COUNT(v.id) = 0')
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id }, relations: ['variants'] });
    if (!product) throw new NotFoundException(`Producto con id '${id}' no encontrado`);
    return product;
  }

  async findByBarcode(barcode: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { barcode, active: true }, relations: ['variants'] });
    if (!product) throw new NotFoundException(`Producto con barcode '${barcode}' no encontrado`);
    return product;
  }

  async findVariantByBarcode(barcode: string): Promise<{ product: Product; variant: ProductVariant }> {
    const variant = await this.variantRepo.findOne({ where: { barcode } });
    if (!variant) throw new NotFoundException(`No se encontró variante con barcode '${barcode}'`);
    const product = await this.findOne(variant.productId);
    if (!product.active) throw new NotFoundException(`Producto con barcode '${barcode}' no encontrado`);
    return { product, variant };
  }

  async findVariantById(id: string): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({ where: { id } });
    if (!variant) throw new NotFoundException(`Variante '${id}' no encontrada`);
    return variant;
  }

  async setVariantStock(variantId: string, stock: number): Promise<void> {
    await this.variantRepo.update(variantId, { stock });
  }

  async findBySystemCode(systemCode: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { systemCode }, relations: ['variants'] });
    if (!product) throw new NotFoundException(`Producto con código '${systemCode}' no encontrado`);
    return product;
  }

  searchByName(query: string): Promise<Product[]> {
    if (!query || query.trim().length === 0) return Promise.resolve([]);
    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'variants')
      .where('p.active = true AND LOWER(p.name) LIKE LOWER(:q)', { q: `%${query.trim()}%` })
      .orderBy('p.name', 'ASC')
      .take(20)
      .getMany();
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    const costPrice = dto.costPrice !== undefined ? dto.costPrice : Number(product.costPrice ?? 0);
    const salePrice = dto.salePrice !== undefined ? dto.salePrice : Number(product.salePrice ?? 0);
    this.validatePrices(costPrice, salePrice);

    const { variants, ...productData } = dto;
    Object.assign(product, productData);
    await this.repo.save(product);

    if (variants !== undefined) {
      await this.variantRepo.delete({ productId: id });
      if (variants.length > 0) {
        const variantEntities = variants.map((v) => this.buildVariantEntity(v, id));
        await this.variantRepo.save(variantEntities);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    product.active = false;
    await this.repo.save(product);
  }

  async generateBarcode(id: string): Promise<Product> {
    const product = await this.findOne(id);
    if (product.barcode) return product;

    let barcode: string;
    let attempts = 0;
    do {
      barcode = this.buildEan13();
      attempts++;
    } while ((await this.repo.findOneBy({ barcode })) !== null && attempts < 10);

    product.barcode = barcode;
    return this.repo.save(product);
  }

  async populateMissingSystemCodes(): Promise<void> {
    const nullCoded = await this.repo
      .createQueryBuilder('p')
      .where('p.system_code IS NULL')
      .getMany();
    if (nullCoded.length === 0) return;
    for (const p of nullCoded) {
      const prefix = p.type === ItemType.SERVICE ? 'S' : 'P';
      p.systemCode = `${prefix}${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
    }
    await this.repo.save(nullCoded);
  }

  private buildEan13(): string {
    const ts = Date.now().toString().slice(-6);
    const prefix = `770000${ts}`;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(prefix[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return prefix + check;
  }
}
