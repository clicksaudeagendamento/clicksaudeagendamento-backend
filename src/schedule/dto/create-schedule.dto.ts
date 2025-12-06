import {
  IsDateString,
  IsNotEmpty,
  IsArray,
  IsString,
  ArrayMinSize,
  IsOptional,
  IsMongoId,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

class RecurrenceDto {
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  occurrences?: number; // Number of times to repeat
}

export class CreateScheduleDto {
  // Legacy field - optional for backward compatibility
  @IsOptional()
  @IsDateString()
  date?: string;

  // New fields for date range
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => !o.date)
  @IsNotEmpty()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  timeSlots: string[];

  @IsOptional()
  @IsMongoId()
  addressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;
}
