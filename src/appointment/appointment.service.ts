import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { Schedule, ScheduleDocument } from 'src/schedule/schedule.schema';
import { User, UserDocument } from 'src/users/user.schema';
import { AddressService } from '../address/address.service';

export interface AppointmentWithProfessional {
  _id: Types.ObjectId;
  scheduleId: Types.ObjectId;
  scheduleDateTime: Date;
  addressId?: Types.ObjectId;
  professional: {
    fullName: string;
    specialty?: string;
    registration?: string;
    address?: string;
    workingHours?: string;
  };
  status: string;
  patient: {
    name: string;
    primaryPhone: string;
    secondaryPhone?: string;
    _id?: Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

@Injectable()
export class AppointmentService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly addressService: AddressService,
  ) {}

  private async getAppointmentWithProfessionalInfo(
    appointmentId: Types.ObjectId,
  ): Promise<AppointmentWithProfessional> {
    const result = await this.appointmentModel.aggregate([
      { $match: { _id: appointmentId } },
      {
        $lookup: {
          from: 'schedules',
          localField: 'schedule',
          foreignField: '_id',
          as: 'scheduleData',
        },
      },
      { $unwind: '$scheduleData' },
      {
        $lookup: {
          from: 'users',
          localField: 'scheduleData.user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $addFields: {
          scheduleId: '$scheduleData._id',
          scheduleDateTime: '$scheduleData.dateTime',
          professional: {
            fullName: '$userData.fullName',
            specialty: '$userData.specialty',
            registration: '$userData.registration',
            address: '$userData.address',
            workingHours: '$userData.workingHours',
          },
        },
      },
      {
        $project: {
          _id: 1,
          scheduleId: 1,
          scheduleDateTime: 1,
          professional: 1,
          status: 1,
          patient: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        },
      },
    ]);

    return result[0] as AppointmentWithProfessional;
  }

  async findAll(
    userId: string,
    filter: FilterAppointmentDto,
  ): Promise<AppointmentWithProfessional[]> {
    // Get user's active addresses
    const activeAddresses = await this.addressService.findActiveByUser(userId);

    // Determine which addressId to use
    let addressIdToFilter: Types.ObjectId | null = null;

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
      addressIdToFilter = new Types.ObjectId(filter.addressId);
    } else if (activeAddresses.length === 1) {
      // Auto-select the only active address
      addressIdToFilter = activeAddresses[0]._id as Types.ObjectId;
    } else if (activeAddresses.length > 1) {
      // Multiple addresses but none specified
      throw new BadRequestException(
        'Você possui múltiplos endereços ativos. Por favor, informe o addressId para filtrar os agendamentos',
      );
    }
    // If no active addresses, proceed without address filter (addressIdToFilter remains null)

    const basePipeline = [
      {
        $lookup: {
          from: 'schedules',
          localField: 'schedule',
          foreignField: '_id',
          as: 'scheduleData',
        },
      },
      { $unwind: '$scheduleData' },
      { $match: { 'scheduleData.user': new Types.ObjectId(userId) } },
      ...(addressIdToFilter
        ? [{ $match: { address: addressIdToFilter } }]
        : []),
      {
        $lookup: {
          from: 'users',
          localField: 'scheduleData.user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $addFields: {
          scheduleId: '$scheduleData._id',
          scheduleDateTime: '$scheduleData.dateTime',
          addressId: '$address',
          professional: {
            fullName: '$userData.fullName',
            specialty: '$userData.specialty',
            registration: '$userData.registration',
            address: '$userData.address',
            workingHours: '$userData.workingHours',
          },
        },
      },
      {
        $project: {
          _id: 1,
          scheduleId: 1,
          scheduleDateTime: 1,
          addressId: 1,
          professional: 1,
          status: 1,
          patient: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        },
      },
    ];

    if (filter.month) {
      const month = parseInt(filter.month, 10);
      if (month < 1 || month > 12) {
        throw new BadRequestException('Invalid month value');
      }

      const monthFilterPipeline = [
        ...basePipeline.slice(0, 3),
        {
          $addFields: {
            month: { $month: '$scheduleData.dateTime' },
          },
        },
        { $match: { month: month } },
        { $unset: 'month' },
        ...basePipeline.slice(3),
      ];

      return this.appointmentModel.aggregate(monthFilterPipeline) as Promise<
        AppointmentWithProfessional[]
      >;
    }

    if (filter.date) {
      const [day, month, year] = filter.date.split('-');
      const start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);

      const dateFilterPipeline = [
        ...basePipeline.slice(0, 3),
        {
          $match: {
            'scheduleData.dateTime': { $gte: start, $lte: end },
          },
        },
        ...basePipeline.slice(3),
      ];

      return this.appointmentModel.aggregate(dateFilterPipeline) as Promise<
        AppointmentWithProfessional[]
      >;
    }

    return this.appointmentModel.aggregate(basePipeline) as Promise<
      AppointmentWithProfessional[]
    >;
  }

  async findByDate(date: string): Promise<AppointmentWithProfessional[]> {
    const [day, month, year] = date.split('-');
    const start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);

    const pipeline = [
      {
        $lookup: {
          from: 'schedules',
          localField: 'schedule',
          foreignField: '_id',
          as: 'scheduleData',
        },
      },
      { $unwind: '$scheduleData' },
      {
        $match: {
          'scheduleData.dateTime': { $gte: start, $lte: end },
          status: 'scheduled', // Only get scheduled appointments
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'scheduleData.user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      { $unwind: '$userData' },
      {
        $addFields: {
          scheduleId: '$scheduleData._id',
          scheduleDateTime: '$scheduleData.dateTime',
          addressId: '$address',
          professional: {
            fullName: '$userData.fullName',
            specialty: '$userData.specialty',
            registration: '$userData.registration',
            address: '$userData.address',
            workingHours: '$userData.workingHours',
          },
        },
      },
      {
        $project: {
          _id: 1,
          scheduleId: 1,
          scheduleDateTime: 1,
          addressId: 1,
          professional: 1,
          status: 1,
          patient: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        },
      },
    ];

    return this.appointmentModel.aggregate(pipeline) as Promise<
      AppointmentWithProfessional[]
    >;
  }

  async create(
    createDto: CreateAppointmentDto,
  ): Promise<AppointmentWithProfessional> {
    const schedule = await this.scheduleModel.findById(createDto.schedule);
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.status !== 'open')
      throw new BadRequestException('Schedule is not open');
    const appointment = new this.appointmentModel({
      schedule: schedule._id,
      status: 'scheduled',
      patient: {
        name: createDto.patientName,
        primaryPhone: createDto.primaryPhone,
        secondaryPhone: createDto.secondaryPhone,
      },
      ...(schedule.address && { address: schedule.address }),
    });
    await appointment.save();
    schedule.status = 'closed';
    schedule.appointment = appointment._id as Types.ObjectId;
    await schedule.save();

    return this.getAppointmentWithProfessionalInfo(
      appointment._id as Types.ObjectId,
    );
  }

  async updateStatus(
    appointmentId: string,
    dto: UpdateAppointmentStatusDto,
    userId: string,
  ): Promise<AppointmentWithProfessional> {
    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .populate('schedule');
    if (!appointment) throw new NotFoundException('Appointment not found');
    const schedule = appointment.schedule as ScheduleDocument;
    if (dto.status === 'cancelled') {
      if (schedule.user.toString() !== userId)
        throw new ForbiddenException(
          'Only the owner can cancel the appointment',
        );
      appointment.status = 'cancelled';
      schedule.status = 'open';
      schedule.appointment = null;
      await schedule.save();
      await appointment.save();

      return this.getAppointmentWithProfessionalInfo(
        appointment._id as Types.ObjectId,
      );
    }
    if (dto.status === 'confirmed') {
      appointment.status = 'confirmed';
      await appointment.save();

      return this.getAppointmentWithProfessionalInfo(
        appointment._id as Types.ObjectId,
      );
    }
    if (dto.status === 'completed') {
      if (appointment.status !== 'confirmed')
        throw new BadRequestException(
          'Only confirmed appointments can be completed',
        );
      appointment.status = 'completed';
      await appointment.save();

      return this.getAppointmentWithProfessionalInfo(
        appointment._id as Types.ObjectId,
      );
    }
    throw new BadRequestException('Invalid status update');
  }

  async delete(appointmentId: string, userId: string) {
    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .populate('schedule');
    if (!appointment) throw new NotFoundException('Appointment not found');
    const schedule = appointment.schedule as ScheduleDocument;
    if (schedule.user.toString() !== userId)
      throw new ForbiddenException('Only the owner can delete the appointment');
    schedule.status = 'open';
    schedule.appointment = null;
    await schedule.save();
    await this.appointmentModel.deleteOne({ _id: appointmentId });
    return { deleted: true };
  }
}
