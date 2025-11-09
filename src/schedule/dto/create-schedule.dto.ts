import {
  IsDateString,
  IsNotEmpty,
  IsArray,
  IsString,
  ArrayMinSize,
  IsMongoId,
} from 'class-validator';

export class CreateScheduleDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  timeSlots: string[];

  @IsMongoId()
  @IsNotEmpty()
  address: string;
}
