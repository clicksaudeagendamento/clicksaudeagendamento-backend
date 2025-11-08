import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSessionService } from './whatsapp-session.service';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappSessionService],
  exports: [WhatsappSessionService],
})
export class WhatsappModule {}
