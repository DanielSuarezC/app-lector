import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter } from 'events';

import { ScannerEvent, ScannerEventType } from './scanner-event.entity';
import { ScannerEventDto } from './dto/scanner-event.dto';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  readonly eventEmitter = new EventEmitter();
  private lastEventAt: Date | null = null;

  constructor(
    @InjectRepository(ScannerEvent)
    private readonly eventRepo: Repository<ScannerEvent>,
  ) {}

  getBridgeStatus() {
    const threshold = 90_000;
    const connected = this.lastEventAt
      ? Date.now() - this.lastEventAt.getTime() < threshold
      : false;
    return { connected, lastEventAt: this.lastEventAt };
  }

  async processEvent(dto: ScannerEventDto): Promise<ScannerEvent> {
    this.lastEventAt = new Date();
    const entity = this.eventRepo.create(dto);
    const saved = await this.eventRepo.save(entity);

    // Emitir evento para SSE (Server-Sent Events)
    this.eventEmitter.emit('scanner:event', saved);

    if (dto.type === ScannerEventType.BARCODE) {
      this.logger.log(`Barcode recibido: ${dto.data} desde bridge '${dto.bridgeId}'`);
    } else if (dto.type === ScannerEventType.TEMP) {
      this.logger.debug(`Temperatura nodo: ${dto.value}°${dto.unit}`);
    }

    return saved;
  }

  getRecentEvents(limit = 50): Promise<ScannerEvent[]> {
    return this.eventRepo.find({
      order: { receivedAt: 'DESC' },
      take: limit,
    });
  }

  getRecentTemperatures(limit = 100): Promise<ScannerEvent[]> {
    return this.eventRepo.find({
      where: { type: ScannerEventType.TEMP },
      order: { receivedAt: 'DESC' },
      take: limit,
    });
  }
}
