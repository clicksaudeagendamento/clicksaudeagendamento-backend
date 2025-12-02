import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Schedule } from '../schedule/schedule.schema';
import { Address } from '../address/address.schema';

export type AppointmentDocument = Appointment & Document;

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'Schedule', required: true })
  schedule: Schedule | Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Address', required: false })
  address: Address | Types.ObjectId;

  @Prop({
    required: true,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
    default: 'scheduled',
  })
  status: AppointmentStatus;

  @Prop({
    type: {
      name: { type: String, required: true },
      primaryPhone: { type: String, required: true },
      secondaryPhone: { type: String, required: false },
    },
    required: true,
  })
  patient: {
    name: string;
    primaryPhone: string;
    secondaryPhone?: string;
  };
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
