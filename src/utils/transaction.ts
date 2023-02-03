import { DebitTransaction } from '@prisma/client';

export const updateBalance = ({
  balance,
  amount,
  direction,
  reverse,
}: {
  balance: string;
  amount: string;
  direction: 'IN' | 'OUT';
  reverse: boolean;
}) => {
  const balanceNumber = Number(balance);
  const amountNumber = Number(amount);
  if (direction === 'IN') {
    return reverse
      ? balanceNumber - amountNumber
      : balanceNumber + amountNumber;
  } else {
    return reverse
      ? balanceNumber + amountNumber
      : balanceNumber - amountNumber;
  }
};

export function findBrickTransactionIndex(
  referenceId: string,
  array: BrickTransactionData[]
): number {
  let index: number = 0;
  for (let i = 0; i < array.length; i++) {
    const element = array[i];

    if (referenceId === element.reference_id) {
      index = i;
    }
  }
  return index;
}

export function findTransactionIndex(
  referenceId: string,
  array: DebitTransaction[]
): number {
  let index: number = 0;
  for (let i = 0; i < array.length; i++) {
    const element = array[i];

    if (referenceId === element.referenceId) {
      index = i;
    }
  }
  return index;
}
