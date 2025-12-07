import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, PlanType, PLANS, PlanConfig } from './user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<void> {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('Password and confirmation do not match');
    }

    if (dto.role === 'admin') {
      const adminExists = await this.userModel.exists({ role: 'admin' });
      if (adminExists) {
        throw new BadRequestException('Only one admin is allowed');
      }
    }

    let plan: PlanType | undefined = 'demo';
    if (dto.role === 'admin') {
      plan = undefined;
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
      role: dto.role || 'customer',
      ...(plan ? { plan } : {}),
      ...(dto.role !== 'admin' ? { accepted: false } : {}),
      specialty: dto.specialty,
      registration: dto.registration,
      address: dto.address,
      workingHours: dto.workingHours,
    });
    await user.save();
  }

  async findAll(): Promise<any[]> {
    const users = await this.userModel.find().select('-password');
    return users.map((user) => {
      const obj = user.toObject
        ? (user.toObject() as User & {
            _id?: string;
            createdAt?: Date;
            updatedAt?: Date;
          })
        : (user as User & {
            _id?: string;
            createdAt?: Date;
            updatedAt?: Date;
          });
      return {
        _id: obj._id ?? null,
        fullName: obj.fullName ?? null,
        email: obj.email ?? null,
        phone: obj.phone ?? null,
        role: obj.role ?? null,
        accepted: obj.accepted ?? null,
        trialEndDate: obj.trialEndDate ?? null,
        plan: obj.plan ? PLANS[obj.plan] : null,
        createdAt: obj.createdAt ?? null,
        updatedAt: obj.updatedAt ?? null,
        specialty: obj.specialty ?? null,
        registration: obj.registration ?? null,
        address: obj.address ?? null,
        workingHours: obj.workingHours ?? null,
        description: obj.description ?? null,
        website: obj.website ?? null,
        instagram: obj.instagram ?? null,
        profileImage: obj.profileImage ?? null,
      };
    });
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async findByPhone(phone: string) {
    return this.userModel.findOne({ phone });
  }

  async findByRegistration(registration: string) {
    return this.userModel.findOne({ registration }).select('-password');
  }

  async findOne(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) throw new NotFoundException('User not found');
    const obj = user.toObject
      ? (user.toObject() as User & {
          _id?: string;
          createdAt?: Date;
          updatedAt?: Date;
        })
      : (user as User & {
          _id?: string;
          createdAt?: Date;
          updatedAt?: Date;
        });
    return {
      _id: obj._id ?? null,
      fullName: obj.fullName ?? null,
      email: obj.email ?? null,
      phone: obj.phone ?? null,
      specialty: obj.specialty ?? null,
      registration: obj.registration ?? null,
      address: obj.address ?? null,
      workingHours: obj.workingHours ?? null,
      description: obj.description ?? null,
      website: obj.website ?? null,
      instagram: obj.instagram ?? null,
      profileImage: obj.profileImage ?? null,
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<void> {
    // Se aceitou o cliente agora, seta trialEndDate para 7 dias depois
    if (dto.accepted === true) {
      const user = await this.userModel.findById(id);
      if (!user) throw new NotFoundException('User not found');
      if (!user.accepted) {
        user.accepted = true;
        user.trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        // Atualiza outros campos se necessário
        if (dto.fullName) user.fullName = dto.fullName;
        if (dto.email) user.email = dto.email;
        if (dto.phone) user.phone = dto.phone;
        if (dto.specialty) user.specialty = dto.specialty;
        if (dto.registration) user.registration = dto.registration;
        if (dto.address) user.address = dto.address;
        if (dto.workingHours) user.workingHours = dto.workingHours;
        if (dto.description) user.description = dto.description;
        if (dto.website) user.website = dto.website;
        if (dto.instagram) user.instagram = dto.instagram;
        if (dto.profileImage !== undefined)
          user.profileImage = dto.profileImage;
        await user.save();
        return;
      }
    }
    // Atualização normal
    const result = await this.userModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!result) throw new NotFoundException('User not found');
    return;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id });
    if (result.deletedCount === 0)
      throw new NotFoundException('User not found');
  }

  async changePassword(
    id: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) throw new BadRequestException('Current password is incorrect');

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await user.save();

    return { message: 'Password updated successfully' };
  }

  /**
   * Get plan configuration for a user
   */
  async getUserPlanConfig(userId: string): Promise<PlanConfig> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const planType = user.plan || 'demo';
    return PLANS[planType];
  }

  /**
   * Check if user can create more addresses
   */
  async canCreateAddress(
    userId: string,
    currentAddressCount: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const planConfig = await this.getUserPlanConfig(userId);

    if (planConfig.maxAddresses === 'unlimited') {
      return { allowed: true };
    }

    if (currentAddressCount >= planConfig.maxAddresses) {
      return {
        allowed: false,
        reason: `Limite de endereços atingido para o plano ${planConfig.name}. Máximo: ${planConfig.maxAddresses}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can create more schedules
   */
  async canCreateSchedule(
    userId: string,
    scheduleCountInPeriod: number,
    totalScheduleCount?: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const planConfig = await this.getUserPlanConfig(userId);

    // Demo plan: check total limit
    if (!planConfig.isPeriodic && planConfig.maxSchedulesTotal !== undefined) {
      if (
        totalScheduleCount !== undefined &&
        totalScheduleCount >= planConfig.maxSchedulesTotal
      ) {
        return {
          allowed: false,
          reason: `Limite total de agendas atingido para o plano ${planConfig.name}. Máximo: ${planConfig.maxSchedulesTotal} agendas no total`,
        };
      }
      return { allowed: true };
    }

    // Other plans: check monthly limit
    if (
      planConfig.isPeriodic &&
      planConfig.maxSchedulesPerMonth !== undefined
    ) {
      if (scheduleCountInPeriod >= planConfig.maxSchedulesPerMonth) {
        return {
          allowed: false,
          reason: `Limite mensal de agendas atingido para o plano ${planConfig.name}. Máximo: ${planConfig.maxSchedulesPerMonth} agendas por mês`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Update verification code for user
   */
  async updateVerificationCode(
    userId: string,
    code: string,
    expiry: Date,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.verificationCode = code;
    user.verificationCodeExpiry = expiry;
    await user.save();
  }

  /**
   * Activate user account after verification
   */
  async activateUser(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.phoneVerified = true;
    user.accepted = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    user.trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days trial
    await user.save();
  }
}
