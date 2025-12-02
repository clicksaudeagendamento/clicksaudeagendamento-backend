import {
  IsDateString,
  IsNotEmpty,
  IsArray,
  IsString,
  ArrayMinSize,
  IsOptional,
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

  @IsOptional()
  @IsMongoId()
  addressId?: string;
}
