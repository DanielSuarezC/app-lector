import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Post(':productId/adjust')
  @ApiOperation({ summary: 'Ajustar stock de un producto manualmente' })
  adjust(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.service.adjustStock(productId, dto);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  getMovements(@Query('productId') productId?: string) {
    return this.service.getMovements(productId);
  }
}
