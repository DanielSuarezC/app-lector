import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ScannerEventType {
  BARCODE = 'barcode',
  TEMP = 'temp',
  BOOT = 'boot',
}

@Entity('scanner_events')
export class ScannerEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ScannerEventType })
  type: ScannerEventType;

  @Column({ nullable: true, length: 64 })
  data: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  value: number;

  @Column({ nullable: true, length: 10 })
  unit: string;

  @Column({ type: 'bigint', nullable: true })
  ts: number;

  @Column({ nullable: true, length: 60 })
  bridgeId: string;

  @CreateDateColumn()
  receivedAt: Date;
}
