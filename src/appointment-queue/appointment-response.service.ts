import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from '../appointment/appointment.schema';
import { MessageResponse } from '../whatsapp/whatsapp-session.service';

export interface AppointmentResponse {
  appointmentId: string;
  patientPhone: string;
  response: 'confirmed' | 'cancelled' | 'unknown';
  message: string;
  timestamp: Date;
}

@Injectable()
export class AppointmentResponseService {
  private readonly logger = new Logger(AppointmentResponseService.name);

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  async processResponse(
    messageResponse: MessageResponse,
  ): Promise<AppointmentResponse | null> {
    try {
      const { from, body, timestamp } = messageResponse;

      // Clean phone number for comparison
      const cleanPhone = from.replace('@c.us', '').replace(/\D/g, '');

      this.logger.log(`Processing response from ${cleanPhone}: ${body}`);

      // Find appointment by phone number
      const appointment = await this.findAppointmentByPhone(cleanPhone);

      if (!appointment) {
        this.logger.warn(`No appointment found for phone: ${cleanPhone}`);
        return null;
      }

      // Determine response type
      const responseType = this.determineResponseType(body);

      // Update appointment status
      await this.updateAppointmentStatus(
        (appointment._id as Types.ObjectId).toString(),
        responseType,
      );

      const result: AppointmentResponse = {
        appointmentId: (appointment._id as Types.ObjectId).toString(),
        patientPhone: cleanPhone,
        response: responseType,
        message: body,
        timestamp,
      };

      this.logger.log(
        `Processed response for appointment ${(appointment._id as Types.ObjectId).toString()}: ${responseType}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error processing appointment response:', error);
      return null;
    }
  }

  private async findAppointmentByPhone(
    phone: string,
  ): Promise<AppointmentDocument | null> {
    try {
      // Find the most recent scheduled appointment for this phone number
      const appointment = await this.appointmentModel
        .findOne({
          'patient.primaryPhone': { $regex: phone, $options: 'i' },
          status: 'scheduled',
        })
        .sort({ createdAt: -1 })
        .exec();

      return appointment;
    } catch (error) {
      this.logger.error('Error finding appointment by phone:', error);
      return null;
    }
  }

  private determineResponseType(
    body: string,
  ): 'confirmed' | 'cancelled' | 'unknown' {
    const confirmKeywords = [
      'sim',
      's',
      'yes',
      'y',
      'confirmo',
      'confirmar',
      'ok',
      'confirmado',
      '✅',
    ];
    const cancelKeywords = [
      'não',
      'nao',
      'n',
      'no',
      'cancelar',
      'cancelado',
      '❌',
    ];

    const lowerBody = body.toLowerCase();

    if (confirmKeywords.some((keyword) => lowerBody.includes(keyword))) {
      return 'confirmed';
    }

    if (cancelKeywords.some((keyword) => lowerBody.includes(keyword))) {
      return 'cancelled';
    }

    return 'unknown';
  }

  private async updateAppointmentStatus(
    appointmentId: string,
    status: 'confirmed' | 'cancelled' | 'unknown',
  ): Promise<void> {
    try {
      let newStatus: string;

      switch (status) {
        case 'confirmed':
          newStatus = 'confirmed';
          break;
        case 'cancelled':
          newStatus = 'cancelled';
          break;
        default:
          newStatus = 'scheduled'; // Keep as scheduled for unknown responses
          break;
      }

      await this.appointmentModel.findByIdAndUpdate(
        new Types.ObjectId(appointmentId),
        {
          status: newStatus,
          updatedAt: new Date(),
        },
      );

      this.logger.log(
        `Updated appointment ${appointmentId} status to: ${newStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating appointment ${appointmentId} status:`,
        error,
      );
    }
  }

  async getResponseStats(): Promise<{
    total: number;
    confirmed: number;
    cancelled: number;
    unknown: number;
  }> {
    try {
      const stats = await this.appointmentModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const result = {
        total: 0,
        confirmed: 0,
        cancelled: 0,
        unknown: 0,
      };

      stats.forEach((stat) => {
        result.total += stat.count;
        switch (stat._id) {
          case 'confirmed':
            result.confirmed = stat.count;
            break;
          case 'cancelled':
            result.cancelled = stat.count;
            break;
          case 'scheduled':
            result.unknown = stat.count;
            break;
        }
      });

      return result;
    } catch (error) {
      this.logger.error('Error getting response stats:', error);
      return { total: 0, confirmed: 0, cancelled: 0, unknown: 0 };
    }
  }
}
