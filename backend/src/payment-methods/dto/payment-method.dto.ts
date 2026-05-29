import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'Efectivo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: 'cash', description: 'Clave única sin espacios ni caracteres especiales' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/, { message: 'La clave solo puede contener letras minúsculas, números, guiones y guiones bajos' })
  key: string;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/, { message: 'La clave solo puede contener letras minúsculas, números, guiones y guiones bajos' })
  key?: string;
}
