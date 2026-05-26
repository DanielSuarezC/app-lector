import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

import { ScannerEventType } from '../scanner-event.entity';

export class ScannerEventDto {
  @ApiProperty({ enum: ScannerEventType })
  @IsEnum(ScannerEventType)
  type: ScannerEventType;

  @ApiPropertyOptional({ example: '7700999012345' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  data?: string;

  @ApiPropertyOptional({ example: 29.5 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: 'C' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  unit?: string;

  @ApiPropertyOptional({ example: 1716900000 })
  @IsOptional()
  @IsNumber()
  ts?: number;

  @ApiPropertyOptional({ example: 'bridge-colina-real-01' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  bridgeId?: string;
}
