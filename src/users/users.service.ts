import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, PlanType, PLANS } from './user.schema';
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
        workingHours: obj.workingHours ?? null,
      };
    });
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
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
      fullName: obj.fullName ?? null,
      email: obj.email ?? null,
      phone: obj.phone ?? null,
      specialty: obj.specialty ?? null,
      registration: obj.registration ?? null,
      workingHours: obj.workingHours ?? null,
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
        if (dto.workingHours) user.workingHours = dto.workingHours;
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
}
