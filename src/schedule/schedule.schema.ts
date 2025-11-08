import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';

export type ScheduleDocument = Schedule & Document;

export type ScheduleStatus = 'open' | 'closed';

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User | Types.ObjectId;

  @Prop({ required: true, enum: ['open', 'closed'], default: 'open' })
  status: ScheduleStatus;

  @Prop({ required: true })
  dateTime: Date;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', default: null })
  appointment: Types.ObjectId | null;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
