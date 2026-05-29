import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaymentMethodEntity } from './payment-method.entity';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethodEntity> {
    const byKey = await this.repo.findOneBy({ key: dto.key });
    if (byKey) throw new ConflictException(`Ya existe un medio de pago con clave '${dto.key}'`);
    const byName = await this.repo.findOneBy({ name: dto.name });
    if (byName) throw new ConflictException(`Ya existe un medio de pago con nombre '${dto.name}'`);
    return this.repo.save(this.repo.create({ ...dto, active: true }));
  }

  findAll(): Promise<PaymentMethodEntity[]> {
    return this.repo.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<PaymentMethodEntity> {
    const pm = await this.repo.findOneBy({ id });
    if (!pm) throw new NotFoundException(`Medio de pago '${id}' no encontrado`);
    return pm;
  }

  async update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethodEntity> {
    const pm = await this.findOne(id);
    if (dto.key && dto.key !== pm.key) {
      const existing = await this.repo.findOneBy({ key: dto.key });
      if (existing) throw new ConflictException(`Ya existe un medio de pago con clave '${dto.key}'`);
    }
    Object.assign(pm, dto);
    return this.repo.save(pm);
  }

  async remove(id: string): Promise<void> {
    const pm = await this.findOne(id);
    pm.active = false;
    await this.repo.save(pm);
  }

  async seed(): Promise<void> {
    const defaults = [
      { key: 'cash', name: 'Efectivo' },
      { key: 'card', name: 'Tarjeta' },
      { key: 'transfer', name: 'Transferencia' },
      { key: 'nequi', name: 'Nequi' },
    ];
    for (const d of defaults) {
      const exists = await this.repo.findOneBy({ key: d.key });
      if (!exists) {
        await this.repo.save(this.repo.create({ ...d, active: true }));
      }
    }
  }
}
