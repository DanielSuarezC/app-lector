import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

import { MovementType } from '../inventory-movement.entity';

export class AdjustStockDto {
  @ApiProperty({ example: 10, description: 'Cantidad a mover (positivo = entrada, negativo = salida)' })
  @IsInt()
  quantity: number;

  @ApiProperty({ enum: MovementType, example: MovementType.RECEPTION })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiPropertyOptional({ example: 'Recepción de mercancía proveedor XYZ' })
  @IsOptional()
  @IsString()
  notes?: string;
}
