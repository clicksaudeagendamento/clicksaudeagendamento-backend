import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AppointmentReminderJob } from './appointment-queue.service';
import {
  WhatsappSessionService,
  MessageResponse,
} from '../whatsapp/whatsapp-session.service';
import { AppointmentResponseService } from './appointment-response.service';
import { MessageHistoryService } from './message-history.service';

const INSTITUTIONAL_MESSAGE = `🤖 Olá! Aqui é a Click Saúde Agendamentos.

Este número é utilizado exclusivamente para envio de lembretes de consultas e confirmação de presença.

📌 No momento, ainda não somos um chatbot completo, mas estamos trabalhando para oferecer mais funcionalidades em breve, como:

Reagendamento automático

Suporte direto

Dúvidas frequentes

Enquanto isso, se precisar de ajuda, entre em contato diretamente com a clínica.
Agradecemos a compreensão! 💙`;

const REINFORCE_MESSAGE = `😅 Opa, não entendi sua resposta!

Por favor, confirme sua presença na consulta respondendo com uma das opções abaixo:

✅ SIM – Estarei presente
❌ NÃO – Desejo remarcar ou cancelar

Assim conseguimos organizar melhor os atendimentos. Obrigado! 💙`;

@Processor('appointment-reminders')
export class AppointmentQueueProcessor {
  private readonly logger = new Logger(AppointmentQueueProcessor.name);

  constructor(
    private readonly whatsappService: WhatsappSessionService,
    private readonly responseService: AppointmentResponseService,
    private readonly messageHistoryService: MessageHistoryService,
  ) {
    this.whatsappService.onMessage((messageResponse: MessageResponse) => {
      this.handleMessageResponse(messageResponse);
    });
  }

  @Process('send-reminder')
  async handleSendReminder(job: Job<AppointmentReminderJob>) {
    const { name, phone, message, appointmentId, scheduledDate } = job.data;

    this.logger.log(
      `Processing reminder for ${name} (${phone}) - Appointment: ${appointmentId}`,
    );

    try {
      if (!this.whatsappService.isConnected()) {
        this.logger.warn('WhatsApp is not connected. Attempting to connect...');
        const connectResult = await this.whatsappService.connect();
        if (!connectResult.success) {
          throw new Error(`Failed to connect WhatsApp: ${connectResult.error}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      const client = this.whatsappService.getClient();
      if (!client) {
        throw new Error('WhatsApp client not available');
      }

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error(`Invalid phone number format: ${phone}`);
      }
      const whatsappPhone = cleanPhone.endsWith('@c.us')
        ? cleanPhone
        : `${cleanPhone}@c.us`;

      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }
      if (!client.pupPage || client.pupPage.isClosed()) {
        throw new Error('WhatsApp page is not ready or closed');
      }

      // Garantir que só um lembrete é enviado por agendamento/dia
      const date = scheduledDate.split('T')[0];
      const alreadySent =
        await this.messageHistoryService.hasSentReminderForDate(
          appointmentId,
          cleanPhone,
          date,
        );
      if (alreadySent) {
        this.logger.warn(
          `Reminder already sent for appointment ${appointmentId} and phone ${cleanPhone} on date ${date}`,
        );
        return;
      }

      // Registrar reminder enviado
      await this.messageHistoryService.logMessage({
        appointmentId,
        patientPhone: cleanPhone,
        type: 'reminder',
        direction: 'sent',
        content: message,
        date,
      });

      const sendPromise = client.sendMessage(whatsappPhone, message);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Send message timeout')), 30000),
      );
      await Promise.race([sendPromise, timeoutPromise]);

      this.logger.log(`Successfully sent reminder to ${name} (${phone})`);
      return {
        success: true,
        appointmentId,
        phone,
        messageSent: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send reminder to ${name} (${phone}):`,
        error,
      );
      if (
        error.message.includes('Invalid phone number') ||
        error.message.includes('Message cannot be empty') ||
        error.message.includes('WhatsApp page is not ready')
      ) {
        this.logger.warn(`Not retrying for error: ${error.message}`);
        return {
          success: false,
          appointmentId,
          phone,
          messageSent: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      throw error;
    }
  }

  private async handleMessageResponse(messageResponse: MessageResponse) {
    try {
      this.logger.log(`Handling message response from ${messageResponse.from}`);
      const cleanPhone = messageResponse.from.replace(/@c\.us$/, '');
      const appointmentId = messageResponse.appointmentId;
      const body = messageResponse.body;

      // Registrar mensagem recebida
      await this.messageHistoryService.logMessage({
        appointmentId,
        patientPhone: cleanPhone,
        type: 'other',
        direction: 'received',
        content: body,
      });

      // Buscar lembrete enviado para este agendamento
      let reminderSent = false;
      let scheduleDateTime: Date | null = null;
      if (appointmentId) {
        // Buscar no histórico se lembrete foi enviado
        const reminder = await this.messageHistoryService.getReminderSent(
          appointmentId,
          cleanPhone,
        );
        if (reminder) {
          reminderSent = true;
          // Buscar o horário do agendamento (scheduleDateTime)
          if ((this as any).appointmentService) {
            const appointment = await (
              this as any
            ).appointmentService.findById?.(appointmentId);
            if (appointment && appointment.scheduleDateTime) {
              scheduleDateTime = new Date(appointment.scheduleDateTime);
            }
          }
        }
      }

      // Se lembrete não foi enviado, ou já passou do horário do agendamento, responde institucional
      const now = new Date();
      if (!reminderSent || (scheduleDateTime && now > scheduleDateTime)) {
        await this.sendInstitutionalMessage(messageResponse.from, cleanPhone);
        return;
      }

      // Se lembrete foi enviado e ainda não passou do horário, segue lógica normal
      if (appointmentId) {
        const alreadyResponded =
          await this.messageHistoryService.hasReceivedSimNao(
            appointmentId,
            cleanPhone,
          );
        if (alreadyResponded) {
          this.logger.log(
            `Already responded to appointment ${appointmentId} for phone ${cleanPhone}`,
          );
          return;
        }
        const result =
          await this.responseService.processResponse(messageResponse);
        if (result && result.response !== 'unknown') {
          // Só envia confirmação/cancelamento se ainda não enviou
          const alreadySent =
            await this.messageHistoryService.hasSentConfirmationOrCancellation(
              appointmentId,
              cleanPhone,
            );
          if (!alreadySent) {
            const client = this.whatsappService.getClient();
            if (client && client.pupPage && !client.pupPage.isClosed()) {
              await client.sendMessage(
                messageResponse.from,
                result.response === 'confirmed'
                  ? '✅ Sua presença foi confirmada! Nos vemos na consulta.'
                  : '❌ Consulta cancelada. Se quiser reagendar, acesse: https://seulink.com/agendar',
              );
              await this.messageHistoryService.logMessage({
                appointmentId,
                patientPhone: cleanPhone,
                type:
                  result.response === 'confirmed'
                    ? 'confirmation'
                    : 'cancellation',
                direction: 'sent',
                content:
                  result.response === 'confirmed'
                    ? '✅ Sua presença foi confirmada! Nos vemos na consulta.'
                    : '❌ Consulta cancelada. Se quiser reagendar, acesse: https://seulink.com/agendar',
                responseType: result.response === 'confirmed' ? 'sim' : 'nao',
                alreadyResponded: true,
              });
            }
          }
          // Registrar resposta recebida
          await this.messageHistoryService.logMessage({
            appointmentId,
            patientPhone: cleanPhone,
            type:
              result.response === 'confirmed' ? 'confirmation' : 'cancellation',
            direction: 'received',
            content: body,
            responseType: result.response === 'confirmed' ? 'sim' : 'nao',
            alreadyResponded: true,
          });
        } else {
          // Mensagem não reconhecida, responde reforço
          const reinforceKey = `reinforce_${appointmentId}_${cleanPhone}`;
          if (!(global as any)[reinforceKey]) {
            const client = this.whatsappService.getClient();
            if (client && client.pupPage && !client.pupPage.isClosed()) {
              await client.sendMessage(messageResponse.from, REINFORCE_MESSAGE);
              (global as any)[reinforceKey] = true;
              this.logger.log(`Sent reinforce message to ${cleanPhone}`);
            }
          }
        }
      } else {
        // Sempre responde institucional se não for resposta de lembrete
        await this.sendInstitutionalMessage(messageResponse.from, cleanPhone);
      }
    } catch (error) {
      this.logger.error('Error handling message response:', error);
    }
  }

  private async sendInstitutionalMessage(
    whatsappFrom: string,
    cleanPhone: string,
  ) {
    const client = this.whatsappService.getClient();
    if (client && client.pupPage && !client.pupPage.isClosed()) {
      await client.sendMessage(whatsappFrom, INSTITUTIONAL_MESSAGE);
      await this.messageHistoryService.logInfoIfNotExists(
        cleanPhone,
        INSTITUTIONAL_MESSAGE,
      );
      this.logger.log(`Sent institutional message to ${cleanPhone}`);
    }
  }
}
