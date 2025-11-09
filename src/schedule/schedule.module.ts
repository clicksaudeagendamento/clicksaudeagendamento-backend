import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schedule, ScheduleSchema } from './schedule.schema';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { UsersModule } from '../users/users.module';
import { AddressModule } from '../address/address.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
    UsersModule,
    AddressModule,
  ],
  providers: [ScheduleService],
  controllers: [ScheduleController],
  exports: [ScheduleService, MongooseModule],
})
export class ScheduleModule {}
