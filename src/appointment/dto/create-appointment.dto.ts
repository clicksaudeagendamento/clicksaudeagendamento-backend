import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  schedule: string;

  @IsString()
  @IsNotEmpty()
  patientName: string;

  @IsString()
  @IsNotEmpty()
  primaryPhone: string;

  @IsString()
  @IsOptional()
  secondaryPhone?: string;
}
