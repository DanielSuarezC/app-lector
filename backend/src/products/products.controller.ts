import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo producto o servicio' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Barcode duplicado' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos/servicios activos' })
  findAll() {
    return this.service.findAll();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock por debajo del mínimo' })
  findLowStock() {
    return this.service.findLowStock();
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar productos por nombre (búsqueda parcial)' })
  @ApiQuery({ name: 'q', description: 'Texto a buscar' })
  searchByName(@Query('q') q: string) {
    return this.service.searchByName(q ?? '');
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Buscar producto por código de barras (referencia)' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.service.findByBarcode(barcode);
  }

  @Get('variant-barcode/:barcode')
  @ApiOperation({ summary: 'Buscar producto+variante por código de barras de variante' })
  findByVariantBarcode(@Param('barcode') barcode: string) {
    return this.service.findVariantByBarcode(barcode);
  }

  @Get('code/:systemCode')
  @ApiOperation({ summary: 'Buscar producto por código de sistema' })
  findBySystemCode(@Param('systemCode') systemCode: string) {
    return this.service.findBySystemCode(systemCode);
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

  @Post(':id/generate-barcode')
  @ApiOperation({ summary: 'Generar código de barras EAN-13 para producto sin código' })
  generateBarcode(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.generateBarcode(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar producto (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
