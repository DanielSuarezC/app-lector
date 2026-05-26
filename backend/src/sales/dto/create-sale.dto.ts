import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString,
  IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentMethod } from '../sale.entity';

export class SaleItemDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, description: 'Cantidad vendida' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 500, description: 'Descuento en COP' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
