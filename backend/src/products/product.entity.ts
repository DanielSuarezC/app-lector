import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export enum ItemType {
  PRODUCT = 'product',
  SERVICE = 'service',
}

export enum SoldBy {
  UNIT = 'unit',
  BOX = 'box',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ name: 'system_code', length: 20, unique: true, nullable: true })
  systemCode?: string;

  @Column({ type: 'varchar', unique: true, length: 64, nullable: true })
  barcode?: string | null;

  @Column({ length: 120 })
  name?: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ length: 80, nullable: true })
  category?: string;

  @Column({ type: 'enum', enum: ItemType, default: ItemType.PRODUCT })
  type?: ItemType;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'cost_price' })
  costPrice?: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'sale_price', default: 0 })
  salePrice?: number;

  @Column({ default: true, name: 'available_for_sale' })
  availableForSale?: boolean;

  @Column({ type: 'enum', enum: SoldBy, default: SoldBy.UNIT, name: 'sold_by' })
  soldBy?: SoldBy;

  @Column({ default: true, name: 'track_inventory' })
  trackInventory?: boolean;

  @Column({ type: 'int', default: 0 })
  stock?: number;

  @Column({ type: 'int', default: 5, name: 'min_stock' })
  minStock?: number;

  @Column({ default: true })
  active?: boolean;

  @OneToMany('ProductVariant', 'product', { cascade: true, eager: false })
  variants?: import('./variant.entity').ProductVariant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      const prefix = this.type === ItemType.SERVICE ? 'S' : 'P';
      this.systemCode = `${prefix}${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
    }
  }
}
