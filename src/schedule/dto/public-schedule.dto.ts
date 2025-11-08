import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class PublicScheduleDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @IsOptional()
  year?: number;
}
