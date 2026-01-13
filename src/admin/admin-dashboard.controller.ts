import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('metrics')
  async getDashboardMetrics() {
    return this.adminDashboardService.getDashboardMetrics();
  }

  @Get('specialties-distribution')
  async getSpecialtiesDistribution() {
    return this.adminDashboardService.getSpecialtiesDistribution();
  }
}