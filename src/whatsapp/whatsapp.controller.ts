import {
  Controller,
  Get,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  WhatsappSessionService,
  SessionStatus,
} from './whatsapp-session.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private readonly sessionService: WhatsappSessionService) {}

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connect() {
    return this.sessionService.connect();
  }

  @Get('status')
  getStatus(): {
    status: SessionStatus;
    isConnected: boolean;
    hasClient: boolean;
    hasPage: boolean;
    pageClosed: boolean;
    timestamp: string;
  } {
    const client = this.sessionService.getClient();
    const hasPage = client?.pupPage !== null && client?.pupPage !== undefined;
    const pageClosed =
      hasPage && client?.pupPage ? client.pupPage.isClosed() : true;

    return {
      status: this.sessionService.getStatus(),
      isConnected: this.sessionService.isConnected(),
      hasClient: client !== null,
      hasPage,
      pageClosed,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reconnect')
  @HttpCode(HttpStatus.OK)
  async reconnect() {
    try {
      await this.sessionService.disconnect();
      const result = await this.sessionService.connect();
      return {
        success: result.success,
        message: result.success
          ? 'Reconnection initiated successfully'
          : 'Reconnection failed',
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Reconnection failed',
        error: error.message,
      };
    }
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect() {
    await this.sessionService.disconnect();
  }
}
