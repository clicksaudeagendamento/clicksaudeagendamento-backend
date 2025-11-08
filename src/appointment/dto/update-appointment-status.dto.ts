import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsEnum(['confirmed', 'completed', 'cancelled'])
  @IsNotEmpty()
  status: 'confirmed' | 'completed' | 'cancelled';
}
