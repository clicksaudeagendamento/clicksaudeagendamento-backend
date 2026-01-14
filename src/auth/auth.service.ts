import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PLANS } from '../users/user.schema';
import { LoginUserDto } from './dto/login-user.dto';
import { WhatsappSessionService } from '../whatsapp/whatsapp-session.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly whatsappService: WhatsappSessionService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    
    // Check if trial period is expired and update accepted status
    if (user.role === 'customer' && user.trialEndDate && user.trialEndDate < new Date()) {
      await this.usersService.update((user._id as any).toString(), { accepted: false });
      user.accepted = false; // Update local user object
    }
    
    if (user.role === 'customer' && !user.accepted) {
      throw new BadRequestException('Usuário inativo. Entre em contato com o administrador pelo número (85) 99424-5460');
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

  /**
   * Generate a 6-digit alphanumeric verification code
   */
  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Send verification code via WhatsApp
   */
  async sendVerificationCode(phone: string): Promise<{ message: string }> {
    // Find user by phone
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Check if user is already verified
    if (user.phoneVerified && user.accepted) {
      throw new BadRequestException('Usuário já verificado');
    }

    // Generate verification code
    const code = this.generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save code to user
    await this.usersService.updateVerificationCode(
      (user._id as any).toString(),
      code,
      expiry,
    );

    // Send code via WhatsApp
    const message = `👋 *Bem-vindo(a) ao ClickSaúde Agendamento!*\n\nPara finalizar seu cadastro, utilize o código: *${code}*\n\nEsse código é válido por 10 minutos.\n\nSe você não solicitou, basta ignorar a mensagem.`;

    try {
      await this.whatsappService.sendMessage(phone, message);
      return {
        message: 'Código de verificação enviado via WhatsApp',
      };
    } catch (error) {
      throw new BadRequestException(
        'Erro ao enviar código via WhatsApp. Certifique-se de que o WhatsApp está conectado.',
      );
    }
  }

  /**
   * Verify the code and activate user account
   */
  async verifyCode(
    phone: string,
    code: string,
  ): Promise<{ message: string; success: boolean }> {
    // Find user by phone
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    // Check if code exists
    if (!user.verificationCode) {
      throw new BadRequestException('Nenhum código de verificação pendente');
    }

    // Check if code expired
    if (
      !user.verificationCodeExpiry ||
      user.verificationCodeExpiry < new Date()
    ) {
      throw new BadRequestException('Código de verificação expirado');
    }

    // Verify code
    if (user.verificationCode.toUpperCase() !== code.toUpperCase()) {
      throw new BadRequestException('Código de verificação inválido');
    }

    // Update user - set phoneVerified and accepted to true, clear verification code
    await this.usersService.activateUser((user._id as any).toString());

    return {
      message: 'Cadastro confirmado com sucesso! Você já pode fazer login.',
      success: true,
    };
  }
}
