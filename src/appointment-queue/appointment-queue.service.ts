import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentService } from '../appointment/appointment.service';
import { MessageHistoryService } from './message-history.service';

export interface AppointmentReminderJob {
  name: string;
  phone: string;
  message: string;
  appointmentId: string;
  scheduledDate: string;
  scheduledTime: string;
}

@Injectable()
export class AppointmentQueueService {
  private readonly logger = new Logger(AppointmentQueueService.name);

  constructor(
    @InjectQueue('appointment-reminders') private readonly queue: Queue,
    private readonly appointmentService: AppointmentService,
    private readonly messageHistoryService: MessageHistoryService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processNextDayAppointments() {
    this.logger.log('Starting to process next day appointments...');

    try {
      // Get tomorrow's date in DD-MM-YYYY format
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowFormatted = tomorrow
        .toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\//g, '-');

      this.logger.log(`Fetching appointments for: ${tomorrowFormatted}`);

      // Get appointments for tomorrow
      const appointments =
        await this.appointmentService.findByDate(tomorrowFormatted);

      this.logger.log(`Found ${appointments.length} appointments for tomorrow`);

      // Process each appointment and add to queue
      for (const appointment of appointments) {
        await this.addAppointmentToQueue(appointment);
      }

      this.logger.log('Finished processing next day appointments');
    } catch (error) {
      this.logger.error('Error processing next day appointments:', error);
    }
  }

  private async addAppointmentToQueue(appointment: any) {
    try {
      // Validate required fields
      if (!appointment.patient?.name || !appointment.patient?.primaryPhone) {
        this.logger.warn(
          `Skipping appointment ${appointment._id}: Missing patient information`,
        );
        return;
      }

      if (!appointment.scheduleDateTime) {
        this.logger.warn(
          `Skipping appointment ${appointment._id}: Missing schedule date time`,
        );
        return;
      }

      if (!appointment.professional?.fullName) {
        this.logger.warn(
          `Skipping appointment ${appointment._id}: Missing professional information`,
        );
        return;
      }

      const formattedPhone = this.formatPhoneNumber(
        appointment.patient.primaryPhone,
      );

      // Garantir que só um lembrete é enviado por agendamento/dia
      const date = new Date(appointment.scheduleDateTime)
        .toISOString()
        .split('T')[0];
      const alreadySent =
        await this.messageHistoryService.hasSentReminderForDate(
          appointment._id.toString(),
          formattedPhone,
          date,
        );
      if (alreadySent) {
        this.logger.warn(
          `Reminder already sent for appointment ${appointment._id} and phone ${formattedPhone} on date ${date}`,
        );
        return;
      }

      const reminderJob: AppointmentReminderJob = {
        name: appointment.patient.name,
        phone: formattedPhone,
        message: this.buildReminderMessage(appointment),
        appointmentId: appointment._id,
        scheduledDate: appointment.scheduleDateTime,
        scheduledTime: appointment.scheduleDateTime,
      };

      await this.queue.add('send-reminder', reminderJob, {
        delay: 0, // Process immediately
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log(
        `Added appointment reminder to queue for ${appointment.patient.name}`,
      );
    } catch (error) {
      this.logger.error(`Error adding appointment to queue: ${error.message}`);
    }
  }

  public formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('55')) {
      return cleaned;
    }

    return `55${cleaned}`;
  }

  private buildReminderMessage(appointment: any): string {
    const patientName = appointment.patient.name;
    const professionalName = appointment.professional.fullName;
    const specialty = appointment.professional.specialty || '';
    const address = appointment.professional.address || '';

    // Format the date and time from scheduleDateTime
    const appointmentDateTime = new Date(appointment.scheduleDateTime);
    const dayOfWeek = appointmentDateTime.toLocaleDateString('pt-BR', {
      weekday: 'long',
    });
    const formattedDate = appointmentDateTime.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const time = appointmentDateTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      👋 Olá, ${patientName}!\n

      ⏰ Este é um lembrete da sua consulta com Dr(a). *${professionalName}*\n

      📆 amanhã, *${dayOfWeek}*, *${formattedDate}*\n
      🕗 *${time}*\n
      ${address ? `📍 https://maps.google.com/?q=${address}\n\n` : '\n\n'}

      Caso precise de mais informações, estamos à disposição.
    `;
  }

  async getQueueStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
