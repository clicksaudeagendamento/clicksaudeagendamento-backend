import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, RemoteAuth, Message } from 'whatsapp-web.js';
import { MongoStore } from 'wwebjs-mongo';
import * as mongoose from 'mongoose';
import * as qrcode from 'qrcode-terminal';

export type SessionStatus =
  | 'DISCONNECTED'
  | 'WAITING_QR'
  | 'CONNECTED'
  | 'AUTH_FAILED'
  | 'CONNECTING';

export interface MessageResponse {
  from: string;
  body: string;
  timestamp: Date;
  appointmentId?: string;
}

@Injectable()
export class WhatsappSessionService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappSessionService.name);
  private client: Client | null = null;
  private status: SessionStatus = 'DISCONNECTED';
  private onQrCallback?: (qr: string) => void;
  private onStatusCallback?: (status: SessionStatus) => void;
  private onClientReadyCallback?: (client: Client) => void;
  private onMessageCallback?: (response: MessageResponse) => void;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor() {
    mongoose.connect('mongodb://localhost:27017/click-saude-agendamento', {
      dbName: 'click-saude-agendamento',
    });
  }

  async onModuleInit() {
    await mongoose.connection.asPromise();
    this.logger.log('WhatsApp Session Service initialized');
    // Auto-connect on startup
    this.autoReconnect();
  }

  private autoReconnect(delayMs: number = 0) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectTimeout = setTimeout(async () => {
      if (this.isConnecting || this.status === 'CONNECTED') {
        return;
      }

      this.logger.log('Attempting to (re)connect WhatsApp session...');
      const result = await this.connect();
      if (!result.success) {
        this.logger.warn(
          `Reconnect failed: ${result.error ?? 'Unknown error'}. Retrying in 10s...`,
        );
        this.autoReconnect(10000); // Retry after 10 seconds
      } else {
        this.logger.log('WhatsApp session connected or restored successfully.');
      }
    }, delayMs);
  }

  async connect(
    onQr?: (qr: string) => void,
    onStatus?: (status: SessionStatus) => void,
    onClientReady?: (client: Client) => void,
    onMessage?: (response: MessageResponse) => void,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isConnecting) {
        return { success: false, error: 'Connection already in progress' };
      }

      if (this.client && this.status === 'CONNECTED') {
        return { success: true };
      }

      this.isConnecting = true;
      this.status = 'CONNECTING';
      this.notifyStatusChange();

      this.onQrCallback = onQr;
      this.onStatusCallback = onStatus;
      this.onClientReadyCallback = onClientReady;
      this.onMessageCallback = onMessage;

      // Safely disconnect existing client
      await this.safeDisconnect();

      const store = new MongoStore({ mongoose, session: 'main-session' });

      this.client = new Client({
        authStrategy: new RemoteAuth({
          store,
          clientId: 'main-client',
          backupSyncIntervalMs: 300000,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ],
        },
      });

      this.registerEventListeners();
      await this.client.initialize();
      this.status = 'WAITING_QR';
      this.notifyStatusChange();

      this.logger.log('WhatsApp client initialized and waiting for QR');
      return { success: true };
    } catch (error: unknown) {
      let errorMsg = 'Unknown error';
      if (typeof error === 'object' && error && 'message' in error) {
        errorMsg = String((error as any).message);
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      this.logger.error('Failed to initialize WhatsApp client', error);
      this.status = 'DISCONNECTED';
      this.notifyStatusChange();
      return { success: false, error: errorMsg };
    } finally {
      this.isConnecting = false;
    }
  }

  private async safeDisconnect(): Promise<void> {
    if (this.client) {
      try {
        // Check if client is properly initialized before destroying
        if (this.client.pupPage && !this.client.pupPage.isClosed()) {
          await this.client.destroy();
          this.logger.log('WhatsApp client destroyed successfully');
        }
      } catch (error: unknown) {
        this.logger.warn(
          'Error destroying WhatsApp client (this is normal during reconnection):',
          error,
        );
      } finally {
        this.cleanup();
      }
    }
  }

  private registerEventListeners() {
    if (!this.client) return;

    this.client.removeAllListeners();

    this.client.on('qr', (qr) => {
      this.status = 'WAITING_QR';
      this.logger.log('QR code generated for authentication');
      qrcode.generate(qr, { small: true });
      this.notifyQr(qr);
      this.notifyStatusChange();
    });

    this.client.on('ready', () => {
      this.status = 'CONNECTED';
      this.logger.log('WhatsApp client connected - ready for message sending');
      this.notifyStatusChange();
      if (this.onClientReadyCallback && this.client) {
        this.onClientReadyCallback(this.client);
      }
    });

    // this.client.on('message', (message: Message) => {
    //   this.handleIncomingMessage(message);
    // });

    this.client.on('disconnected', (reason) => {
      this.status = 'DISCONNECTED';
      this.logger.warn(`WhatsApp client disconnected: ${reason}`);
      this.notifyStatusChange();
      this.cleanup();
      this.autoReconnect(5000); // Try to reconnect after 5 seconds
    });

    this.client.on('auth_failure', () => {
      this.status = 'AUTH_FAILED';
      this.logger.error('WhatsApp authentication failed');
      this.notifyStatusChange();
      this.cleanup();
      this.autoReconnect(10000); // Try to reconnect after 10 seconds
    });

    this.client.on('error', (error: unknown) => {
      this.logger.error('WhatsApp client error', error);
      this.status = 'DISCONNECTED';
      this.notifyStatusChange();
      this.cleanup();
      this.autoReconnect(10000); // Try to reconnect after 10 seconds
    });
  }

  private handleIncomingMessage(message: Message) {
    try {
      // Only process messages from others (not from ourselves)
      if (message.fromMe) {
        return;
      }

      const response: MessageResponse = {
        from: message.from,
        body: message.body.toLowerCase().trim(),
        timestamp: new Date(),
      };

      this.logger.log(`Received message from ${message.from}: ${message.body}`);

      // Try to extract appointment ID from context (if available)
      // This could be enhanced with a more sophisticated tracking system
      response.appointmentId = this.extractAppointmentIdFromContext(message);

      // Notify callback if registered
      if (this.onMessageCallback) {
        this.onMessageCallback(response);
      }

      // Auto-respond based on message content - DISABLED FOR NOW
      // this.autoRespondToMessage(message, response);
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
    }
  }

  private extractAppointmentIdFromContext(
    message: Message,
  ): string | undefined {
    // This is a simple implementation - could be enhanced with:
    // - Message threading
    // - Database lookup by phone number
    // - Session management
    // - Message correlation

    // For now, we'll return undefined and let the business logic handle it
    return undefined;
  }

  // DISABLED: Auto-reply functionality
  /*
  private async autoRespondToMessage(
    message: Message,
    response: MessageResponse,
  ) {
    try {
      const body = response.body;
      let replyMessage = '';

      // Check for confirmation responses
      if (this.isConfirmationResponse(body)) {
        replyMessage =
          '✅ Confirmação recebida! Sua presença foi confirmada. Obrigado!';
      } else if (this.isCancellationResponse(body)) {
        replyMessage =
          '❌ Entendido. Seu agendamento foi cancelado. Entre em contato conosco para reagendar.';
      } else {
        // Default response for unrecognized messages
        replyMessage =
          'Por favor, responda com:\n✅ SIM - para confirmar presença\n❌ NÃO - para cancelar/remarcar';
      }

      if (replyMessage) {
        await message.reply(replyMessage);
        this.logger.log(`Auto-replied to ${message.from}: ${replyMessage}`);
      }
    } catch (error) {
      this.logger.error('Error auto-responding to message:', error);
    }
  }
  */

  // DISABLED: Confirmation detection
  /*
  private isConfirmationResponse(body: string): boolean {
    const confirmKeywords = [
      'sim',
      's',
      'yes',
      'y',
      'confirmo',
      'confirmar',
      'ok',
      'confirmado',
      '✅',
    ];
    return confirmKeywords.some((keyword) => body.includes(keyword));
  }

  private isCancellationResponse(body: string): boolean {
    const cancelKeywords = [
      'não',
      'nao',
      'n',
      'no',
      'cancelar',
      'cancelado',
      '❌',
    ];
    return cancelKeywords.some((keyword) => body.includes(keyword));
  }
  */

  private notifyQr(qr: string) {
    if (this.onQrCallback) {
      this.onQrCallback(qr);
    }
  }

  private notifyStatusChange() {
    if (this.onStatusCallback) {
      this.onStatusCallback(this.status);
    }
  }

  private cleanup() {
    this.client = null;
    this.status = 'DISCONNECTED';
  }

  async disconnect(): Promise<void> {
    await this.safeDisconnect();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  getStatus(): SessionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED' && this.client !== null;
  }

  getClient(): Client | null {
    return this.isConnected() ? this.client : null;
  }

  // Method to register message callback
  onMessage(callback: (response: MessageResponse) => void) {
    this.onMessageCallback = callback;
  }
}
