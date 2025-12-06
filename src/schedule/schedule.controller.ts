import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { FilterScheduleDto } from './dto/filter-schedule.dto';
import { DeleteScheduleByDateDto } from './dto/delete-schedule-by-date.dto';
import { PublicScheduleDto } from './dto/public-schedule.dto';

interface RequestWithUser {
  user: {
    userId: string;
  };
}

interface DeleteByDateResponse {
  deleted: boolean;
  deletedCount: number;
  date: string;
}

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('public')
  async getPublicSchedules(@Query() dto: PublicScheduleDto) {
    return this.scheduleService.getPublicSchedules(dto);
  }

  @Get('count/total')
  @UseGuards(JwtAuthGuard)
  async getTotalScheduleCount(@Req() req: RequestWithUser): Promise<number> {
    return this.scheduleService.getTotalScheduleCount(req.user.userId);
  }

  @Get('count/monthly')
  @UseGuards(JwtAuthGuard)
  async getMonthlyScheduleCount(@Req() req: RequestWithUser): Promise<number> {
    return this.scheduleService.getMonthlyScheduleCount(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateScheduleDto, @Req() req: RequestWithUser) {
    return this.scheduleService.create(dto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Req() req: RequestWithUser,
    @Query() filter: FilterScheduleDto,
  ) {
    return this.scheduleService.findAll(req.user.userId, filter);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.scheduleService.delete(id, req.user.userId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteByDate(
    @Query() dto: DeleteScheduleByDateDto,
    @Req() req: RequestWithUser,
  ): Promise<DeleteByDateResponse> {
    return await this.scheduleService.deleteByDate(dto.date, req.user.userId);
  }
}
