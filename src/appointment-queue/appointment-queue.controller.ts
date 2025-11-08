import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentQueueService } from './appointment-queue.service';
import { WhatsappSessionService } from '../whatsapp/whatsapp-session.service';
import { AppointmentService } from '../appointment/appointment.service';
import { AppointmentResponseService } from './appointment-response.service';

interface TestMessageDto {
  phone: string;
  message: string;
}

@Controller('appointment-queue')
@UseGuards(JwtAuthGuard)
export class AppointmentQueueController {
  constructor(
    private readonly queueService: AppointmentQueueService,
    private readonly whatsappService: WhatsappSessionService,
    private readonly appointmentService: AppointmentService,
    private readonly responseService: AppointmentResponseService,
  ) {}

  @Post('process-next-day')
  async processNextDayAppointments() {
    await this.queueService.processNextDayAppointments();
    return { message: 'Processing next day appointments started' };
  }

  @Post('process-date')
  async processAppointmentsForDate(@Body() body: { date: string }) {
    try {
      const appointments = await this.appointmentService.findByDate(body.date);

      let processed = 0;
      let skipped = 0;

      for (const appointment of appointments) {
        try {
          // Use the private method directly for testing
          await this.queueService['addAppointmentToQueue'](appointment);
          processed++;
        } catch (error) {
          skipped++;
          console.error(
            `Error processing appointment ${appointment._id}:`,
            error,
          );
        }
      }

      return {
        message: `Processed ${processed} appointments, skipped ${skipped}`,
        total: appointments.length,
        processed,
        skipped,
        date: body.date,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process appointments: ${error.message}`,
      };
    }
  }

  @Get('stats')
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Get('response-stats')
  async getResponseStats() {
    return this.responseService.getResponseStats();
  }

  @Post('test-message')
  async sendTestMessage(@Body() testMessage: TestMessageDto) {
    try {
      // Check if WhatsApp is connected
      if (!this.whatsappService.isConnected()) {
        return {
          success: false,
          error: 'WhatsApp is not connected. Please connect first.',
        };
      }

      // Get the WhatsApp client
      const client = this.whatsappService.getClient();
      if (!client) {
        return {
          success: false,
          error: 'WhatsApp client not available',
        };
      }

      // Format phone number
      const formattedPhone = this.queueService.formatPhoneNumber(
        testMessage.phone,
      );

      // Send the message
      await client.sendMessage(`${formattedPhone}@c.us`, testMessage.message);

      return {
        success: true,
        message: 'Test message sent successfully',
        phone: formattedPhone,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send test message: ${error.message}`,
      };
    }
  }
}
