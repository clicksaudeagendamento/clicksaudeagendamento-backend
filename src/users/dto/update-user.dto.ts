import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  specialty?: string;
  registration?: string;
  workingHours?: string;
  accepted?: boolean;
}
