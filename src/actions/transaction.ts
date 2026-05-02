'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function addTransaction(data: {
  groupId?: string;
  tradeDate: Date;
  symbol: string;
  assetType: 'STOCK' | 'CALL' | 'PUT';
  action: 'BUY' | 'SELL' | 'EXERCISE' | 'ASSIGNMENT' | 'EXPIRATION';
  quantity: number;
  price: number;
  strike?: number;
  expiration?: Date;
  multiplier?: number;
  fees?: number;
}) {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        groupId: data.groupId,
        tradeDate: data.tradeDate,
        symbol: data.symbol.toUpperCase(),
        assetType: data.assetType,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        strike: data.strike,
        expiration: data.expiration,
        multiplier: data.multiplier ?? 100,
        fees: data.fees ?? 0,
      },
    });

    revalidatePath('/'); // Revalidate dashboard and all paths depending on this
    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to add transaction:', error);
    return { success: false, error: 'Failed to add transaction' };
  }
}

export async function deleteTransaction(id: string) {
  try {
    await prisma.transaction.delete({
      where: { id },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return { success: false, error: 'Failed to delete transaction' };
  }
}

export async function getAllTransactions() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { tradeDate: 'desc' },
    });
    return transactions;
  } catch (error) {
    console.error('Failed to get transactions:', error);
    return [];
  }
}

export async function bulkDeleteTransactions(ids: string[]) {
  try {
    await prisma.transaction.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to bulk delete transactions:', error);
    return { success: false, error: 'Failed to delete transactions' };
  }
}
