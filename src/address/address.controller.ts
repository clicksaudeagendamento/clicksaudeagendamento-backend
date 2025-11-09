import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

interface RequestWithUser {
  user: {
    userId: string;
  };
}

@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateAddressDto, @Req() req: RequestWithUser) {
    return this.addressService.create(dto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: RequestWithUser) {
    return this.addressService.findAll(req.user.userId);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.addressService.findByUserId(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.addressService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
    @Req() req: RequestWithUser,
  ) {
    return this.addressService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.addressService.remove(id, req.user.userId);
  }
}
