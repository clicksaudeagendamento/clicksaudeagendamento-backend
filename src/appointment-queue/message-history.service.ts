import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MessageHistory,
  MessageHistoryDocument,
} from './message-history.schema';

@Injectable()
export class MessageHistoryService {
  private readonly logger = new Logger(MessageHistoryService.name);

  constructor(
    @InjectModel(MessageHistory.name)
    private readonly messageHistoryModel: Model<MessageHistoryDocument>,
  ) {}

  async logMessage(params: {
    appointmentId?: string | Types.ObjectId;
    patientPhone: string;
    type: 'reminder' | 'confirmation' | 'cancellation' | 'info' | 'other';
    direction: 'sent' | 'received';
    content: string;
    responseType?: 'sim' | 'nao' | 'other';
    alreadyResponded?: boolean;
    date?: string;
  }) {
    const doc = new this.messageHistoryModel({
      ...params,
      appointmentId: params.appointmentId
        ? new Types.ObjectId(params.appointmentId)
        : undefined,
    });
    await doc.save();
    this.logger.log(
      `Logged message: ${params.type} (${params.direction}) for phone ${params.patientPhone}`,
    );
  }

  async hasSentConfirmationOrCancellation(
    appointmentId: string,
    patientPhone: string,
  ): Promise<boolean> {
    const count = await this.messageHistoryModel.countDocuments({
      appointmentId: new Types.ObjectId(appointmentId),
      patientPhone,
      type: { $in: ['confirmation', 'cancellation'] },
      direction: 'sent',
    });
    return count > 0;
  }

  async hasReceivedSimNao(
    appointmentId: string,
    patientPhone: string,
  ): Promise<boolean> {
    const count = await this.messageHistoryModel.countDocuments({
      appointmentId: new Types.ObjectId(appointmentId),
      patientPhone,
      type: { $in: ['confirmation', 'cancellation'] },
      direction: 'received',
    });
    return count > 0;
  }

  async logInfoIfNotExists(patientPhone: string, content: string) {
    const exists = await this.messageHistoryModel.exists({
      patientPhone,
      type: 'info',
      content,
      direction: 'sent',
    });
    if (!exists) {
      await this.logMessage({
        patientPhone,
        type: 'info',
        direction: 'sent',
        content,
      });
    }
  }

  async hasSentReminderForDate(
    appointmentId: string,
    patientPhone: string,
    date: string,
  ): Promise<boolean> {
    const count = await this.messageHistoryModel.countDocuments({
      appointmentId: new Types.ObjectId(appointmentId),
      patientPhone,
      type: 'reminder',
      direction: 'sent',
      date,
    });
    return count > 0;
  }

  async getReminderSent(
    appointmentId: string,
    patientPhone: string,
  ): Promise<MessageHistoryDocument | null> {
    return this.messageHistoryModel.findOne({
      appointmentId: new Types.ObjectId(appointmentId),
      patientPhone,
      type: 'reminder',
      direction: 'sent',
    });
  }
}
