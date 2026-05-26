import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  NEQUI = 'nequi',
}

export interface SaleItemSnapshot {
  productId: string;
  barcode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  transactionNumber: string;

  @Column({ type: 'jsonb' })
  items: SaleItemSnapshot[];

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
