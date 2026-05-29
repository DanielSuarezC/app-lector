import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString,
  IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class QuickServiceItemDto {
  @ApiProperty({ example: 'Impresión Carta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Servicios' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateSaleDto {
  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiPropertyOptional({ type: [QuickServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickServiceItemDto)
  quickItems?: QuickServiceItemDto[];

  @ApiProperty({ example: 'cash', description: 'Clave del medio de pago' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
