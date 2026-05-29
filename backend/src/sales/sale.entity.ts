import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export interface SaleItemSnapshot {
  productId: string;
  systemCode?: string;
  barcode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  category?: string;
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20, name: 'transaction_number', nullable: true })
  transactionNumber: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: SaleItemSnapshot[];

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ length: 60, name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
