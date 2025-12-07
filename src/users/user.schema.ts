import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type UserDocument = User & Document;

export type PlanType = 'demo' | 'basic' | 'professional' | 'enterprise';

export interface PlanConfig {
  name: string;
  price: number;
  credits: number;
  maxSchedulesPerMonth?: number; // undefined means unlimited
  maxSchedulesTotal?: number; // for demo plan only
  maxAddresses: number | 'unlimited';
  isPeriodic: boolean; // true if monthly limit, false if total limit
}

export const PLANS: Record<PlanType, PlanConfig> = {
  demo: {
    name: 'demo',
    price: 0,
    credits: 50,
    maxSchedulesTotal: 50, // Total limit of 50 schedules
    maxAddresses: 1,
    isPeriodic: false, // Not monthly, it's a total limit
  },
  basic: {
    name: 'one',
    price: 67,
    credits: 80,
    maxSchedulesPerMonth: 80, // 80 schedules per month
    maxAddresses: 1,
    isPeriodic: true,
  },
  professional: {
    name: 'pro',
    price: 99,
    credits: 120,
    maxSchedulesPerMonth: 120, // 120 schedules per month
    maxAddresses: 3,
    isPeriodic: true,
  },
  enterprise: {
    name: 'prime',
    price: 159,
    credits: 300,
    maxSchedulesPerMonth: 300, // 300 schedules per month
    maxAddresses: 'unlimited',
    isPeriodic: true,
  },
};

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['admin', 'customer'], default: 'customer' })
  role: 'admin' | 'customer';

  @Prop({ default: false })
  accepted?: boolean;

  @Prop({ default: false })
  phoneVerified?: boolean;

  @Prop()
  verificationCode?: string;

  @Prop()
  verificationCodeExpiry?: Date;

  @Prop()
  trialEndDate?: Date;

  @Prop({
    type: String,
    enum: ['demo', 'one', 'pro', 'prime'],
    default: 'demo',
  })
  plan?: PlanType;

  @Prop({ required: false })
  specialty?: string;

  @Prop({ required: false })
  registration?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  workingHours?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  website?: string;

  @Prop({ required: false })
  instagram?: string;

  @Prop({ required: false })
  profileImage?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
