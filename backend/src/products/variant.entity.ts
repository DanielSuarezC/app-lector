import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'system_code', length: 20, unique: true, nullable: true })
  systemCode?: string;

  @Column({ length: 60, name: 'option_name' })
  optionName: string;

  @Column({ length: 120, name: 'option_value' })
  optionValue: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'cost_price' })
  costPrice: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'sale_price' })
  salePrice: number;

  @Column({ length: 64, nullable: true })
  barcode?: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0, name: 'min_stock' })
  minStock: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = `V${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
    }
  }
}
