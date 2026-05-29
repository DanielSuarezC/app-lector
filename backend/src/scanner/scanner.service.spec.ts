import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ScannerService } from './scanner.service';
import { ScannerEvent, ScannerEventType } from './scanner-event.entity';

const makeEventRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('ScannerService', () => {
  let service: ScannerService;
  let eventRepo: ReturnType<typeof makeEventRepo>;

  const barcodeEvent: Partial<ScannerEvent> = {
    id: 'evt-uuid',
    type: ScannerEventType.BARCODE,
    data: '7700999012345',
    bridgeId: 'bridge-01',
    receivedAt: new Date(),
  };

  const tempEvent: Partial<ScannerEvent> = {
    id: 'evt-temp-uuid',
    type: ScannerEventType.TEMP,
    value: 29.5,
    unit: 'C',
    bridgeId: 'bridge-01',
    receivedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScannerService,
        { provide: getRepositoryToken(ScannerEvent), useFactory: makeEventRepo },
      ],
    }).compile();

    service = module.get<ScannerService>(ScannerService);
    eventRepo = module.get(getRepositoryToken(ScannerEvent));
  });

  describe('getBridgeStatus', () => {
    it('retorna connected=false cuando no hay eventos previos', () => {
      const status = service.getBridgeStatus();
      expect(status.connected).toBe(false);
      expect(status.lastEventAt).toBeNull();
    });

    it('retorna connected=true justo después de procesar un evento', async () => {
      eventRepo.create.mockReturnValue(barcodeEvent);
      eventRepo.save.mockResolvedValue(barcodeEvent);

      await service.processEvent({
        type: ScannerEventType.BARCODE,
        data: '7700999012345',
        bridgeId: 'bridge-01',
      });

      const status = service.getBridgeStatus();
      expect(status.connected).toBe(true);
      expect(status.lastEventAt).toBeInstanceOf(Date);
    });
  });

  describe('processEvent', () => {
    it('guarda un evento de barcode y lo retorna', async () => {
      eventRepo.create.mockReturnValue(barcodeEvent);
      eventRepo.save.mockResolvedValue(barcodeEvent);

      const result = await service.processEvent({
        type: ScannerEventType.BARCODE,
        data: '7700999012345',
        bridgeId: 'bridge-01',
      });

      expect(result).toEqual(barcodeEvent);
      expect(eventRepo.create).toHaveBeenCalled();
      expect(eventRepo.save).toHaveBeenCalled();
    });

    it('guarda un evento de temperatura', async () => {
      eventRepo.create.mockReturnValue(tempEvent);
      eventRepo.save.mockResolvedValue(tempEvent);

      const result = await service.processEvent({
        type: ScannerEventType.TEMP,
        value: 29.5,
        unit: 'C',
        bridgeId: 'bridge-01',
      });

      expect(result).toEqual(tempEvent);
    });

    it('emite el evento "scanner:event" al EventEmitter', async () => {
      eventRepo.create.mockReturnValue(barcodeEvent);
      eventRepo.save.mockResolvedValue(barcodeEvent);

      const emitSpy = jest.spyOn(service.eventEmitter, 'emit');
      await service.processEvent({
        type: ScannerEventType.BARCODE,
        data: '1234567890123',
      });

      expect(emitSpy).toHaveBeenCalledWith('scanner:event', barcodeEvent);
    });
  });

  describe('getRecentEvents', () => {
    it('retorna los últimos N eventos', async () => {
      eventRepo.find.mockResolvedValue([barcodeEvent, tempEvent]);

      const result = await service.getRecentEvents(50);
      expect(result).toHaveLength(2);
      expect(eventRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('getRecentTemperatures', () => {
    it('retorna solo eventos de temperatura', async () => {
      eventRepo.find.mockResolvedValue([tempEvent]);

      const result = await service.getRecentTemperatures(100);
      expect(result).toHaveLength(1);
      expect(eventRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: ScannerEventType.TEMP },
          take: 100,
        }),
      );
    });
  });
});
