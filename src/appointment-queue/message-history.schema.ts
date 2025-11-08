import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageHistoryDocument = MessageHistory & Document;

@Schema({ timestamps: true })
export class MessageHistory {
  @Prop({ type: Types.ObjectId, required: false })
  appointmentId?: Types.ObjectId;

  @Prop({ required: true })
  patientPhone: string;

  @Prop({
    required: true,
    enum: ['reminder', 'confirmation', 'cancellation', 'info', 'other'],
  })
  type: 'reminder' | 'confirmation' | 'cancellation' | 'info' | 'other';

  @Prop({ required: true, enum: ['sent', 'received'] })
  direction: 'sent' | 'received';

  @Prop({ required: true })
  content: string;

  @Prop({ required: false, enum: ['sim', 'nao', 'other'] })
  responseType?: 'sim' | 'nao' | 'other';

  @Prop({ default: false })
  alreadyResponded: boolean;

  @Prop({ required: false })
  date?: string; // yyyy-mm-dd
}

export const MessageHistorySchema =
  SchemaFactory.createForClass(MessageHistory);
