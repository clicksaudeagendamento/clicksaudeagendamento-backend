import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class HealthService {
  private version: string;

  constructor() {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
      );
      this.version = packageJson.version || 'unknown';
    } catch (error) {
      this.version = 'unknown';
    }
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.version,
    };
  }
}
