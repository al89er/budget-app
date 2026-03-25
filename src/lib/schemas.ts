import { z } from 'zod';

// Base Schemas
export const AccountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['BANK', 'CASH', 'EWALLET', 'SAVINGS', 'CREDIT_CARD', 'OTHER']),
  openingBalance: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  parentId: z.string().uuid().optional().nullable(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const TransactionSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.coerce.date(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  categoryIds: z.array(z.string().uuid()).optional().default([]),
  sourceAccountId: z.string().uuid().optional().nullable(),
  destinationAccountId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  isRetrospective: z.boolean().default(false),
}).refine(data => {
  if (data.type === 'INCOME' && !data.destinationAccountId) {
    return false;
  }
  return true;
}, { message: "Income transactions require a destination account", path: ['destinationAccountId'] })
.refine(data => {
  if (data.type === 'EXPENSE' && !data.sourceAccountId) {
    return false;
  }
  return true;
}, { message: "Expense transactions require a source account", path: ['sourceAccountId'] })
.refine(data => {
  if (data.type === 'TRANSFER' && (!data.sourceAccountId || !data.destinationAccountId)) {
    return false;
  }
  return true;
}, { message: "Transfers require both source and destination accounts", path: ['destinationAccountId'] })
.refine(data => {
  if (data.type === 'TRANSFER' && data.sourceAccountId === data.destinationAccountId) {
    return false;
  }
  return true;
}, { message: "Source and destination accounts cannot be the same", path: ['destinationAccountId'] });

export const BudgetSchema = z.object({
  id: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
  amount: z.coerce.number().positive('Amount must be positive'),
  categoryId: z.string().uuid(),
});
