import { enumType } from 'nexus';

export const ExpenseTypeEnum = enumType({
  name: 'ExpenseTypeEnum',
  members: ['INCOME', 'EXPENSE', 'TRANSFER', 'RECONCILE'],
});

export const DirectionTypeEnum = enumType({
  name: 'DirectionTypeEnum',
  members: ['IN', 'OUT'],
});

export const TransactionMethodEnum = enumType({
  name: 'TransactionMethodEnum',
  members: ['VirtualAccount', 'mPayment', 'QRIS', 'Debit'],
});

export const ExpenseTypeNoTransferEnum = enumType({
  name: 'ExpenseTypeNoTransferEnum',
  members: ['INCOME', 'EXPENSE', 'RECONCILE'],
});
