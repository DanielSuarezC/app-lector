import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScannerEvent } from './scanner-event.entity';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ScannerEvent])],
  providers: [ScannerService],
  controllers: [ScannerController],
  exports: [ScannerService],
})
export class ScannerModule {}
