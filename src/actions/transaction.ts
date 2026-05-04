'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Validation Schemas ---

const AssetType = z.enum(['STOCK', 'CALL', 'PUT']);
const Action = z.enum(['BUY', 'SELL', 'EXERCISE', 'ASSIGNMENT', 'EXPIRATION']);

const TransactionSchema = z.object({
  groupId: z.string().uuid().optional(),
  tradeDate: z.coerce.date().refine(d => d <= new Date(), {
    message: 'Trade date cannot be in the future',
  }),
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .regex(/^[A-Za-z0-9.^-]+$/, 'Invalid symbol format')
    .transform(s => s.toUpperCase()),
  assetType: AssetType,
  action: Action,
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().nonnegative('Price must be non-negative'),
  strike: z.number().positive('Strike must be positive').optional(),
  expiration: z.coerce.date().optional(),
  multiplier: z.number().int().positive().optional(),
  fees: z.number().nonnegative('Fees must be non-negative').optional(),
}).refine(
  (data) => {
    // Options must have strike and expiration
    if (data.assetType !== 'STOCK') {
      return data.strike != null && data.expiration != null;
    }
    return true;
  },
  { message: 'Options require both strike price and expiration date' }
);

const IdSchema = z.string().uuid('Invalid transaction ID');
const BulkIdsSchema = z.array(IdSchema).min(1, 'At least one ID required').max(500, 'Too many IDs');

// --- Server Actions ---

export async function addTransaction(rawData: {
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
  const parsed = TransactionSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error('Validation failed:', parsed.error.flatten());
    return { success: false, error: parsed.error.flatten().formErrors.join('; ') || 'Validation failed' };
  }

  const data = parsed.data;

  try {
    // Normalize quantity sign based on action
    let quantity = data.quantity;
    if (data.action === 'SELL' || data.action === 'EXERCISE') {
      quantity = -Math.abs(quantity);
    } else if (data.action === 'BUY' || data.action === 'ASSIGNMENT') {
      quantity = Math.abs(quantity);
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create the primary option transaction
      const primaryTx = await tx.transaction.create({
        data: {
          groupId: data.groupId,
          tradeDate: data.tradeDate,
          symbol: data.symbol,
          assetType: data.assetType,
          action: data.action,
          quantity,
          price: data.price,
          strike: data.strike,
          expiration: data.expiration,
          multiplier: data.multiplier ?? (data.assetType === 'STOCK' ? 1 : 100),
          fees: data.fees ?? 0,
        },
      });

      // 2. Automatically create the corresponding stock transaction for Exercise/Assignment
      if (data.action === 'EXERCISE' || data.action === 'ASSIGNMENT') {
        let stockAction: 'BUY' | 'SELL';
        if (data.action === 'EXERCISE') {
          stockAction = data.assetType === 'CALL' ? 'BUY' : 'SELL';
        } else {
          stockAction = data.assetType === 'CALL' ? 'SELL' : 'BUY';
        }

        const multiplier = data.multiplier ?? 100;
        const stockQty = data.quantity * multiplier;
        const signedStockQty = stockAction === 'SELL' ? -Math.abs(stockQty) : Math.abs(stockQty);

        await tx.transaction.create({
          data: {
            tradeDate: data.tradeDate,
            symbol: data.symbol,
            assetType: 'STOCK',
            action: stockAction,
            quantity: signedStockQty,
            price: data.strike || 0,
            multiplier: 1,
            fees: 0,
          }
        });
      }

      return primaryTx;
    });

    revalidatePath('/'); 
    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to add transaction:', error);
    return { success: false, error: 'Failed to add transaction' };
  }
}

export async function deleteTransaction(id: string) {
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: 'Invalid transaction ID' };
  }

  try {
    await prisma.transaction.delete({
      where: { id: parsed.data },
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
  const parsed = BulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { success: false, error: 'Invalid transaction IDs' };
  }

  try {
    await prisma.transaction.deleteMany({
      where: {
        id: {
          in: parsed.data,
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
