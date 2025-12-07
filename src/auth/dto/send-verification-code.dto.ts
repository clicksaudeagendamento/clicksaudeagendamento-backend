import { IsString, Length } from 'class-validator';

export class SendVerificationCodeDto {
  @IsString()
  phone: string;
}
