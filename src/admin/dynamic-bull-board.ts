import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { createBullBoard } from '@bull-board/api';
import * as Bull from 'bull';
import { Router } from 'express';

// Instância única do Bull Board
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Instância global do Bull Board
const { addQueue, removeQueue } = createBullBoard({
  queues: [],
  serverAdapter,
});

// Função para registrar uma fila dinâmica
export function registerDynamicQueue(queueName: string, queueOptions: any) {
  const queue = new Bull(queueName, queueOptions);
  addQueue(new BullAdapter(queue));
}

// Exporta o router para ser usado no main.ts
export const bullBoardRouter: Router = serverAdapter.getRouter();
