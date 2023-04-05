import { enumType } from 'nexus';

export const ExpenseTypeEnum = enumType({
  name: 'ExpenseTypeEnum',
  members: ['INCOME', 'EXPENSE'],
});

export const DirectionTypeEnum = enumType({
  name: 'DirectionTypeEnum',
  members: ['IN', 'OUT'],
});

export const TransactionMethodEnum = enumType({
  name: 'TransactionMethodEnum',
  members: ['VirtualAccount', 'mPayment', 'QRIS', 'Debit'],
});

export const typeOfAccount = enumType({
  name: 'typeOfAccount',
  members: ['CASH', 'DEBIT', 'EWALLET', 'EMONEY', 'PAYLATER'],
});

export const typeOfMutationType = enumType({
  name: 'typeOfMutationType',
  members: ['ADD', 'EDIT', 'DELETE'],
});

export const Month = enumType({
  name: 'Month',
  members: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
});

export const BudgetTypeEnum = enumType({
  name: 'BudgetTypeEnum',
  members: ['MONTHLY', 'CUSTOM'],
});
