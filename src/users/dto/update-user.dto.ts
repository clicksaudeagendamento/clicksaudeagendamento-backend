import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  specialty?: string;
  registration?: string;
  address?: string;
  workingHours?: string;
  description?: string;
  website?: string;
  instagram?: string;
  accepted?: boolean;
}
