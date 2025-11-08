import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Schedule, ScheduleDocument } from './schedule.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { FilterScheduleDto } from './dto/filter-schedule.dto';
import { PublicScheduleDto } from './dto/public-schedule.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    private readonly usersService: UsersService,
  ) {}

  async getPublicSchedules(dto: PublicScheduleDto) {
    if (!Types.ObjectId.isValid(dto.userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const year = new Date().getFullYear();
    const month = Number(dto.month);

    if (month < 1 || month > 12) {
      throw new BadRequestException(
        'Invalid month value. Must be between 1 and 12',
      );
    }

    const result = await this.scheduleModel.aggregate([
      { $match: { user: new Types.ObjectId(dto.userId) } },
      {
        $addFields: {
          month: { $month: '$dateTime' },
          year: { $year: '$dateTime' },
        },
      },
      {
        $match: {
          month: month,
          year: year,
          status: 'open', // Only open schedules
        },
      },
      { $unset: ['month', 'year'] },
      {
        $addFields: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$dateTime',
              timezone: '-03:00',
            },
          },
          time: {
            $dateToString: {
              format: '%H:%M',
              date: '$dateTime',
              timezone: '-03:00',
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          date: 1,
          time: 1,
          status: 1,
          dateTime: 1,
        },
      },
      { $sort: { dateTime: 1 } },
    ]);

    return result;
  }

  async create(createScheduleDto: CreateScheduleDto, userId: string) {
    const schedules: any[] = [];
    const baseDate = new Date(createScheduleDto.date);

    for (const timeSlot of createScheduleDto.timeSlots) {
      const [hours, minutes] = timeSlot.split(':').map(Number);

      // Montar a string ISO local para garantir o horário correto
      const datePart = createScheduleDto.date.split('T')[0];
      const dateString = `${datePart}T${timeSlot}:00`;
      const dateTime = new Date(dateString);

      const schedule = new this.scheduleModel({
        dateTime,
        user: new Types.ObjectId(userId),
        status: 'open',
        appointment: null,
      });

      const savedSchedule = await schedule.save();
      schedules.push(savedSchedule);
    }

    return schedules;
  }

  async findAll(userId: string, filter: FilterScheduleDto) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    if (filter.month) {
      const month = parseInt(filter.month, 10);
      if (month < 1 || month > 12) {
        throw new BadRequestException('Invalid month value');
      }

      const year = new Date().getFullYear();

      const result = await this.scheduleModel.aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $addFields: {
            month: { $month: '$dateTime' },
            year: { $year: '$dateTime' },
          },
        },
        {
          $match: {
            month: month,
            year: year,
          },
        },
        { $unset: ['month', 'year'] },
        {
          $addFields: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$dateTime',
                timezone: '-03:00',
              },
            },
            time: {
              $dateToString: {
                format: '%H:%M',
                date: '$dateTime',
                timezone: '-03:00',
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            date: 1,
            time: 1,
            status: 1,
            dateTime: 1,
          },
        },
        { $sort: { dateTime: 1 } },
      ]);

      return result;
    }

    if (filter.date) {
      const [day, month, year] = filter.date.split('-');
      const start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
      const query = {
        user: new Types.ObjectId(userId),
        dateTime: { $gte: start, $lte: end },
      };
      return this.scheduleModel.find(query).exec();
    }

    // If no filters, return all schedules for the user
    return this.scheduleModel.find({ user: new Types.ObjectId(userId) }).exec();
  }

  async delete(scheduleId: string, userId: string) {
    const schedule = await this.scheduleModel.findById(scheduleId);
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.user.toString() !== userId)
      throw new ForbiddenException('You can only delete your own schedules');
    // Cascade: if appointment exists, delete it (assume appointment is a subdocument or handle in controller)
    await this.scheduleModel.deleteOne({ _id: scheduleId });
    // If appointment is a separate collection, handle deletion here
    return { deleted: true };
  }

  async deleteByDate(date: string, userId: string) {
    // Parse date from dd-mm-yyyy format
    const [day, month, year] = date.split('-');
    if (!day || !month || !year) {
      throw new BadRequestException('Invalid date format. Use dd-mm-yyyy');
    }

    // Create date range for the specific day
    const start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);

    // Find all schedules for the user on the specified date
    const schedules = await this.scheduleModel.find({
      user: new Types.ObjectId(userId),
      dateTime: { $gte: start, $lte: end },
    });

    if (schedules.length === 0) {
      throw new NotFoundException('No schedules found for the specified date');
    }

    // Delete all schedules for the date
    const result = await this.scheduleModel.deleteMany({
      user: new Types.ObjectId(userId),
      dateTime: { $gte: start, $lte: end },
    });

    return {
      deleted: true,
      deletedCount: result.deletedCount,
      date: date,
    };
  }

  async attachAppointment(scheduleId: string, appointment: any) {
    // When an appointment is created, set status to closed and attach appointment
    return this.scheduleModel.findByIdAndUpdate(
      scheduleId,
      { status: 'closed', appointment },
      { new: true },
    );
  }

  async detachAppointment(scheduleId: string) {
    // When an appointment is deleted, set status to open and appointment to null
    return this.scheduleModel.findByIdAndUpdate(
      scheduleId,
      { status: 'open', appointment: null },
      { new: true },
    );
  }
}
