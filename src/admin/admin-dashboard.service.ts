import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, PLANS } from '../users/user.schema';
import { Appointment, AppointmentDocument } from '../appointment/appointment.schema';

export interface DashboardMetrics {
  activeProfessionals: number;
  todayAppointments: number;
  monthlyRevenue: number;
}

export interface SpecialtyDistribution {
  specialty: string;
  count: number;
  percentage: number;
}

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Conta profissionais ativos (role = customer, que são os profissionais)
    const activeProfessionals = await this.userModel.countDocuments({
      role: 'customer',
    });

    // Conta agendamentos de hoje
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayAppointments = await this.appointmentModel.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    // Calcula receita mensal baseada nos planos dos usuários
    const monthlyRevenue = await this.calculateMonthlyRevenue();

    return {
      activeProfessionals,
      todayAppointments,
      monthlyRevenue,
    };
  }

  async getSpecialtiesDistribution(): Promise<SpecialtyDistribution[]> {
    // Agrupa profissionais por especialidade
    const specialtyAggregation = await this.userModel.aggregate([
      {
        $match: {
          role: 'customer',
          specialty: { 
            $exists: true, 
            $nin: [null, '', undefined] 
          }
        },
      },
      {
        $group: {
          _id: '$specialty',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Calcula total de profissionais com especialidade definida
    const totalProfessionals = specialtyAggregation.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    // Converte para o formato esperado com porcentagem
    const distribution: SpecialtyDistribution[] = specialtyAggregation.map(
      (item) => ({
        specialty: item._id || 'Não especificada',
        count: item.count,
        percentage: totalProfessionals > 0 
          ? parseFloat(((item.count / totalProfessionals) * 100).toFixed(2))
          : 0,
      }),
    );

    return distribution;
  }

  private async calculateMonthlyRevenue(): Promise<number> {
    // Agrupa usuários por tipo de plano
    const planDistribution = await this.userModel.aggregate([
      {
        $match: {
          role: 'customer',
          plan: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
        },
      },
    ]);

    // Calcula receita total baseada na quantidade de usuários por plano
    let totalRevenue = 0;

    for (const planGroup of planDistribution) {
      const planType = planGroup._id;
      const userCount = planGroup.count;
      
      if (PLANS[planType]) {
        totalRevenue += PLANS[planType].price * userCount;
      }
    }

    return totalRevenue;
  }
}