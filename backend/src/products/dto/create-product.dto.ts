import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min, MaxLength, IsEnum,
  IsBoolean, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType, SoldBy } from '../product.entity';

export class CreateVariantDto {
  @ApiProperty({ example: 'Color' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  optionName: string;

  @ApiProperty({ example: 'Rojo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  optionValue: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: '7700999012345' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}

export class CreateProductDto {
  @ApiPropertyOptional({ example: '7700999012345', description: 'Código de barras (referencia, opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiProperty({ example: 'Lapicero BIC Azul x1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Lapicero tinta azul, punta media' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: 'Lapiceros' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ enum: ItemType, default: ItemType.PRODUCT })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @ApiPropertyOptional({ example: 500, description: 'Precio de costo (puede ser 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Precio de venta (0 = se ingresa al momento de vender)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  availableForSale?: boolean;

  @ApiPropertyOptional({ enum: SoldBy, default: SoldBy.UNIT })
  @IsOptional()
  @IsEnum(SoldBy)
  soldBy?: SoldBy;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
