import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'O endereço deve ter pelo menos 10 caracteres' })
  address: string;
}
