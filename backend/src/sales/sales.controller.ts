import { Controller, Get, Post, Body, Query, Param, ParseUUIDPipe } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Listar ventas filtradas por fecha' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(from, to);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Resumen del día actual' })
  getDailySummary() {
    return this.service.getDailySummary();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen completo: totales, por método de pago, por categoría, serie diaria' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getSalesSummary(from, to);
  }
}
