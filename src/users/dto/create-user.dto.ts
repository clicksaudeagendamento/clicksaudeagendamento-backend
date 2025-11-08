import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PlanType } from '../user.schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;

  @IsEnum(['admin', 'customer'])
  @IsOptional()
  role?: 'admin' | 'customer';

  @IsEnum(['demo', 'basic', 'professional', 'enterprise'])
  @IsOptional()
  plan?: PlanType;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  registration?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  workingHours?: string;
}
