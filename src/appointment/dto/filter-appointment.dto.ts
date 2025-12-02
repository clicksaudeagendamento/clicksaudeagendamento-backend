import { IsOptional, IsString, Matches, IsMongoId } from 'class-validator';

export class FilterAppointmentDto {
  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Month must be in MM format (01-12)',
  })
  month?: string; // format: mm

  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/, {
    message: 'Date must be in DD-MM-YYYY format',
  })
  date?: string; // format: dd-mm-yyyy

  @IsMongoId()
  @IsOptional()
  addressId?: string;
}
