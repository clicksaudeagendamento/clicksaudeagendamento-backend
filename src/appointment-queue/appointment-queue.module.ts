import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentQueueService } from './appointment-queue.service';
import { AppointmentQueueProcessor } from './appointment-queue.processor';
import { AppointmentQueueController } from './appointment-queue.controller';
import { AppointmentResponseService } from './appointment-response.service';
import { AppointmentModule } from '../appointment/appointment.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import {
  Appointment,
  AppointmentSchema,
} from '../appointment/appointment.schema';
import { MessageHistory, MessageHistorySchema } from './message-history.schema';
import { MessageHistoryService } from './message-history.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'appointment-reminders',
    }),
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: MessageHistory.name, schema: MessageHistorySchema },
    ]),
    AppointmentModule,
    WhatsappModule,
  ],
  controllers: [AppointmentQueueController],
  providers: [
    AppointmentQueueService,
    AppointmentQueueProcessor,
    AppointmentResponseService,
    MessageHistoryService,
  ],
  exports: [
    AppointmentQueueService,
    AppointmentResponseService,
    MessageHistoryService,
  ],
})
export class AppointmentQueueModule {}
