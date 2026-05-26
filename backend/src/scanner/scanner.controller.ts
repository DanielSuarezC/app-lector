import {
  Controller, Post, Get, Body, Res, UseGuards, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { Response } from 'express';

import { ScannerService } from './scanner.service';
import { ScannerEventDto } from './dto/scanner-event.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('scanner')
@Controller('scanner')
export class ScannerController {
  constructor(private readonly service: ScannerService) {}

  @Post('event')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Recibir evento del bridge-local (barcode / temp / boot)' })
  processEvent(@Body() dto: ScannerEventDto) {
    return this.service.processEvent(dto);
  }

  @Get('events')
  @ApiOperation({ summary: 'Últimos N eventos del scanner' })
  getEvents(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.getRecentEvents(limit);
  }

  @Get('temperatures')
  @ApiOperation({ summary: 'Historial de temperaturas del nodo Arduino' })
  getTemperatures(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.service.getRecentTemperatures(limit);
  }

  @Get('stream')
  @ApiOperation({ summary: 'Server-Sent Events: eventos del scanner en tiempo real' })
  stream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    this.service.eventEmitter.on('scanner:event', send);

    // Heartbeat cada 30s para mantener la conexión
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    res.on('close', () => {
      this.service.eventEmitter.off('scanner:event', send);
      clearInterval(heartbeat);
    });
  }
}
