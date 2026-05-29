import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';

import { Product } from '../products/product.entity';

export enum MovementType {
  SALE = 'sale',
  RECEPTION = 'reception',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'enum', enum: MovementType, default: MovementType.ADJUSTMENT })
  type: MovementType;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  stockBefore: number;

  @Column({ type: 'int', default: 0 })
  stockAfter: number;

  @Column({ length: 40, nullable: true })
  source: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
