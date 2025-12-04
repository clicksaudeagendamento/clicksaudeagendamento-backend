import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type UserDocument = User & Document;

export type PlanType = 'demo' | 'basic' | 'professional' | 'enterprise';

export const PLANS = {
  demo: { name: 'demo', price: 0, credits: 50 },
  basic: { name: 'basic', price: 97, credits: 1000 },
  professional: { name: 'professional', price: 197, credits: 5000 },
  enterprise: { name: 'enterprise', price: 397, credits: 10000 },
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

  @Prop()
  trialEndDate?: Date;

  @Prop({
    type: String,
    enum: ['demo', 'basic', 'professional', 'enterprise'],
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
