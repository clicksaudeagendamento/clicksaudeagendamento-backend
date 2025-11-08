import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schedule, ScheduleSchema } from './schedule.schema';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
    UsersModule,
  ],
  providers: [ScheduleService],
  controllers: [ScheduleController],
  exports: [ScheduleService, MongooseModule],
})
export class ScheduleModule {}
