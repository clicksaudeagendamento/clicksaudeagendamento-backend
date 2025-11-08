import { IsOptional, IsString } from 'class-validator';

export class FilterScheduleDto {
  @IsString()
  @IsOptional()
  month?: string; // format: mm

  @IsString()
  @IsOptional()
  date?: string; // format: dd-mm-yyyy
}
