import { IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @IsString()
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
