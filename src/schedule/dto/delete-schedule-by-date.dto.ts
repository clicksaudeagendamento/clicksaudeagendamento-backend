import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class DeleteScheduleByDateDto {
  @IsString()
  @IsNotEmpty()
  date: string; // format: dd-mm-yyyy
}
