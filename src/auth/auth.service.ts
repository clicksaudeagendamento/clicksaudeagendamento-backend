import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PLANS } from '../users/user.schema';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    if (user.role === 'customer' && !user.accepted) {
      throw new BadRequestException('Aguardando aprovação do administrador');
    }
    return user;
  }

  async login(dto: LoginUserDto) {
    const user = await this.validateUser(dto.email, dto.password);
    const payload = { sub: user._id, email: user.email, role: user.role };
    // Remove senha do objeto retornado
    const userObj = user.toObject ? user.toObject() : { ...user };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '8h' }),
      user: {
        id: user._id,
        fullName: userObj.fullName,
        email: userObj.email,
        phone: userObj.phone,
        role: userObj.role,
        accepted: userObj.accepted,
        trialEndDate: userObj.trialEndDate,
        plan: userObj.plan ? PLANS[userObj.plan] : null,
      },
    };
  }
}
