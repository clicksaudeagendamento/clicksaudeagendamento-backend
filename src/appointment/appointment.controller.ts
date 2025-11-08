import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  AppointmentService,
  AppointmentWithProfessional,
} from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser {
  user: {
    userId: string;
  };
}

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Req() req: RequestWithUser,
    @Query() filter: FilterAppointmentDto,
  ): Promise<AppointmentWithProfessional[]> {
    return this.appointmentService.findAll(req.user.userId, filter);
  }

  @Post()
  async create(
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentWithProfessional> {
    return this.appointmentService.create(dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: RequestWithUser,
  ): Promise<AppointmentWithProfessional> {
    return this.appointmentService.updateStatus(id, dto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.appointmentService.delete(id, req.user.userId);
  }
}
