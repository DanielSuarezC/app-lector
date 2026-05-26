import {
  Controller, Get, Post, Put, Delete, Param, Body,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  @ApiResponse({ status: 409, description: 'Barcode duplicado' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos activos' })
  findAll() {
    return this.service.findAll();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock por debajo del mínimo' })
  findLowStock() {
    return this.service.findLowStock();
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Buscar producto por código de barras' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.service.findByBarcode(barcode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar producto (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
