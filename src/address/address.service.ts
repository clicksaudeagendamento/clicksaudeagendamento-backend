import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address, AddressDocument } from './address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
  ) {}

  async create(createAddressDto: CreateAddressDto, userId: string) {
    const address = new this.addressModel({
      ...createAddressDto,
      user: new Types.ObjectId(userId),
    });
    return address.save();
  }

  async findAll(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }
    return this.addressModel.find({ user: new Types.ObjectId(userId) }).exec();
  }

  async findByUserId(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }
    return this.addressModel.find({ user: new Types.ObjectId(userId) }).exec();
  }

  async findOne(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid address id format');
    }
    const address = await this.addressModel.findById(id);
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    if (address.user.toString() !== userId) {
      throw new ForbiddenException('You can only access your own addresses');
    }
    return address;
  }

  async update(id: string, updateAddressDto: UpdateAddressDto, userId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid address id format');
    }
    const address = await this.addressModel.findById(id);
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    if (address.user.toString() !== userId) {
      throw new ForbiddenException('You can only update your own addresses');
    }
    return this.addressModel.findByIdAndUpdate(id, updateAddressDto, {
      new: true,
    });
  }

  async remove(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid address id format');
    }
    const address = await this.addressModel.findById(id);
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    if (address.user.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own addresses');
    }
    await this.addressModel.deleteOne({ _id: id });
    return { deleted: true };
  }
}
