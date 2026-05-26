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

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  stockBefore: number;

  @Column({ type: 'int' })
  stockAfter: number;

  @Column({ length: 40, nullable: true })
  source: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
