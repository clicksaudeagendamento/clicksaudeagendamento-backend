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
import { AddressService } from '../address/address.service';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    private readonly usersService: UsersService,
    private readonly addressService: AddressService,
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

    // Build the initial match criteria
    const matchCriteria: any = { user: new Types.ObjectId(dto.userId) };

    // Add address filter if provided
    if (dto.addressId) {
      if (!Types.ObjectId.isValid(dto.addressId)) {
        throw new BadRequestException('Invalid addressId format');
      }
      matchCriteria.address = new Types.ObjectId(dto.addressId);
    }

    const result = await this.scheduleModel.aggregate([
      { $match: matchCriteria },
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
    // Get user plan configuration
    const planConfig = await this.usersService.getUserPlanConfig(userId);

    // Calculate dates to process
    const datesToProcess = this.calculateDatesToProcess(createScheduleDto);
    const schedulesToCreateCount =
      datesToProcess.length * createScheduleDto.timeSlots.length;

    // For demo plan: check total schedules
    if (!planConfig.isPeriodic && planConfig.maxSchedulesTotal !== undefined) {
      const totalScheduleCount = await this.scheduleModel.countDocuments({
        user: new Types.ObjectId(userId),
      });

      const validation = await this.usersService.canCreateSchedule(
        userId,
        0, // not used for demo
        totalScheduleCount + schedulesToCreateCount,
      );

      if (!validation.allowed) {
        throw new ForbiddenException(validation.reason);
      }
    }

    // For other plans: check monthly schedules
    if (
      planConfig.isPeriodic &&
      planConfig.maxSchedulesPerMonth !== undefined
    ) {
      // Get current month's schedule count
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const monthlyScheduleCount = await this.scheduleModel.countDocuments({
        user: new Types.ObjectId(userId),
        dateTime: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

      const validation = await this.usersService.canCreateSchedule(
        userId,
        monthlyScheduleCount + schedulesToCreateCount,
      );

      if (!validation.allowed) {
        throw new ForbiddenException(validation.reason);
      }
    }

    const schedules: any[] = [];

    // Determine the dates to create schedules for

    for (const dateStr of datesToProcess) {
      for (const timeSlot of createScheduleDto.timeSlots) {
        const [hours, minutes] = timeSlot.split(':').map(Number);

        // Build ISO date string with time
        const datePart = dateStr.split('T')[0];
        const dateString = `${datePart}T${timeSlot}:00`;
        const dateTime = new Date(dateString);

        const schedule = new this.scheduleModel({
          dateTime,
          user: new Types.ObjectId(userId),
          status: 'open',
          appointment: null,
          ...(createScheduleDto.addressId && {
            address: new Types.ObjectId(createScheduleDto.addressId),
          }),
        });

        const savedSchedule = await schedule.save();
        schedules.push(savedSchedule);
      }
    }

    return schedules;
  }

  /**
   * Calculate which dates to create schedules for based on the DTO
   */
  private calculateDatesToProcess(dto: CreateScheduleDto): string[] {
    const dates: string[] = [];

    // Legacy support: if 'date' is provided, use it
    if (dto.date) {
      dates.push(dto.date);
      return dates;
    }

    // New flow: use startDate/endDate with optional recurrence
    if (!dto.startDate) {
      throw new BadRequestException(
        'Either date or startDate must be provided',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(dto.startDate);

    // Validate date range
    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be after or equal to startDate',
      );
    }

    // Handle recurrence
    if (dto.recurrence && dto.recurrence.enabled) {
      return this.calculateRecurringDates(startDate, dto.recurrence);
    }

    // Handle date range (all days between startDate and endDate)
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Calculate recurring dates based on a specific day of week
   */
  private calculateRecurringDates(
    startDate: Date,
    recurrence: { dayOfWeek?: number; occurrences?: number },
  ): string[] {
    const dates: string[] = [];
    const dayOfWeek = recurrence.dayOfWeek ?? startDate.getDay();
    const occurrences = recurrence.occurrences ?? 1;

    // Find the first occurrence of the specified day of week starting from startDate
    const currentDate = new Date(startDate);
    const daysUntilTarget = (dayOfWeek - currentDate.getDay() + 7) % 7;
    currentDate.setDate(currentDate.getDate() + daysUntilTarget);

    // If we've moved past the start date and it wasn't the target day, start from the found day
    // If start date IS the target day, use it
    if (startDate.getDay() === dayOfWeek) {
      currentDate.setTime(startDate.getTime());
    }

    // Generate dates for the specified number of occurrences
    for (let i = 0; i < occurrences; i++) {
      dates.push(currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
      currentDate.setDate(currentDate.getDate() + 7); // Move to next week
    }

    return dates;
  }

  async findAll(userId: string, filter: FilterScheduleDto) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    // Get user's active addresses
    const activeAddresses = await this.addressService.findActiveByUser(userId);

    // Determine which addressId to use
    let addressIdToFilter: string | null = null;

    if (filter.addressId) {
      // Validate that the provided addressId belongs to user and is active
      const isValid = activeAddresses.some(
        (addr) => (addr._id as Types.ObjectId).toString() === filter.addressId,
      );
      if (!isValid) {
        throw new BadRequestException(
          'O endereço informado não existe ou não está ativo',
        );
      }
      addressIdToFilter = filter.addressId;
    } else if (activeAddresses.length === 1) {
      // Auto-select the only active address
      addressIdToFilter = (activeAddresses[0]._id as Types.ObjectId).toString();
    } else if (activeAddresses.length > 1) {
      // Multiple addresses but none specified
      throw new BadRequestException(
        'Você possui múltiplos endereços ativos. Por favor, informe o addressId para filtrar as agendas',
      );
    }
    // If no active addresses, proceed without address filter (addressIdToFilter remains null)

    const matchCondition: any = { user: new Types.ObjectId(userId) };
    if (addressIdToFilter) {
      matchCondition.address = new Types.ObjectId(addressIdToFilter);
    }

    if (filter.month) {
      const month = parseInt(filter.month, 10);
      if (month < 1 || month > 12) {
        throw new BadRequestException('Invalid month value');
      }

      const year = new Date().getFullYear();

      const result = await this.scheduleModel.aggregate([
        { $match: matchCondition },
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
            address: 1,
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
      matchCondition.dateTime = { $gte: start, $lte: end };
      return this.scheduleModel.find(matchCondition).exec();
    }

    // If no filters, return all schedules for the user
    return this.scheduleModel.find(matchCondition).exec();
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

  async getTotalScheduleCount(userId: string): Promise<number> {
    return this.scheduleModel.countDocuments({
      user: new Types.ObjectId(userId),
    });
  }

  async getMonthlyScheduleCount(userId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return this.scheduleModel.countDocuments({
      user: new Types.ObjectId(userId),
      dateTime: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });
  }
}
