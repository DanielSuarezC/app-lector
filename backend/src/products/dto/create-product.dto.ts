import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsInt, Min, MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: '7700999012345', description: 'Código de barras único del producto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  barcode: string;

  @ApiProperty({ example: 'Lapicero BIC Azul x1', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Lapiceros', description: 'Categoría del producto' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiProperty({ example: 500, description: 'Precio de costo en COP' })
  @IsNumber()
  @IsPositive()
  costPrice: number;

  @ApiProperty({ example: 1000, description: 'Precio de venta en COP' })
  @IsNumber()
  @IsPositive()
  salePrice: number;

  @ApiPropertyOptional({ example: 50, description: 'Stock inicial' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5, description: 'Stock mínimo antes de alerta' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}
