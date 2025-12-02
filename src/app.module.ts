import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ScheduleModule as ScheduleAppModule } from './schedule/schedule.module';
import { AppointmentModule } from './appointment/appointment.module';
import { AppointmentQueueModule } from './appointment-queue/appointment-queue.module';
import { AddressModule } from './address/address.module';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: +(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    WhatsappModule,
    ScheduleAppModule,
    AppointmentModule,
    AppointmentQueueModule,
    AddressModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
