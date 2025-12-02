import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'O endereço deve ter pelo menos 10 caracteres' })
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
