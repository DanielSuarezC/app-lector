import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una venta y descontar inventario' })
  create(@Body() dto: CreateSaleDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ventas (últimas 100 o filtradas por fecha)' })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-12-31' })
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(from, to);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Resumen de ventas del día actual' })
  getDailySummary() {
    return this.service.getDailySummary();
  }
}
