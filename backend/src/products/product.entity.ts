import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 64 })
  barcode: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 80, nullable: true })
  category: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  costPrice: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  salePrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 5 })
  minStock: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
