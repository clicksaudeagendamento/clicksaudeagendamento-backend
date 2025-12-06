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
import { UsersService } from '../users/users.service';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new address for a user
   */
  async create(
    createAddressDto: CreateAddressDto,
    userId: string,
  ): Promise<Address> {
    // Check current address count
    const currentAddressCount = await this.addressModel.countDocuments({
      user: new Types.ObjectId(userId),
    });

    // Validate against plan limits
    const validation = await this.usersService.canCreateAddress(
      userId,
      currentAddressCount,
    );
    if (!validation.allowed) {
      throw new ForbiddenException(validation.reason);
    }

    const newAddress = new this.addressModel({
      ...createAddressDto,
      user: new Types.ObjectId(userId),
    });

    return newAddress.save();
  }

  /**
   * Get all addresses for a specific user
   */
  async findAllByUser(userId: string): Promise<AddressDocument[]> {
    return this.addressModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get all active addresses for a specific user
   */
  async findActiveByUser(userId: string): Promise<AddressDocument[]> {
    return this.addressModel
      .find({ user: new Types.ObjectId(userId), isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get a specific address by ID
   */
  async findOne(id: string, userId: string): Promise<Address> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de endereço inválido');
    }

    const address = await this.addressModel.findById(id).exec();

    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    // Verify ownership
    if (address.user.toString() !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este endereço',
      );
    }

    return address;
  }

  /**
   * Update an address
   */
  async update(
    id: string,
    updateAddressDto: UpdateAddressDto,
    userId: string,
  ): Promise<Address> {
    // Verify ownership first
    await this.findOne(id, userId);

    const updatedAddress = await this.addressModel
      .findByIdAndUpdate(id, updateAddressDto, { new: true })
      .exec();

    if (!updatedAddress) {
      throw new NotFoundException('Endereço não encontrado');
    }

    return updatedAddress;
  }

  /**
   * Delete an address
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify ownership first
    await this.findOne(id, userId);

    const result = await this.addressModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Endereço não encontrado');
    }
  }

  /**
   * Check if address exists and belongs to user
   */
  async validateAddressOwnership(
    addressId: string,
    userId: string,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(addressId)) {
      return false;
    }

    const address = await this.addressModel
      .findOne({
        _id: new Types.ObjectId(addressId),
        user: new Types.ObjectId(userId),
      })
      .exec();

    return !!address;
  }

  /**
   * Get address by ID without ownership check (for internal use)
   */
  async findById(id: string): Promise<Address | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.addressModel.findById(id).exec();
  }
}
