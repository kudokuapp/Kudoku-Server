export const updateBalance = ({
  balance,
  amount,
  type,
  reverse,
}: {
  balance: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  reverse: boolean;
}) => {
  const balanceNumber = Number(balance);
  const amountNumber = Number(amount);
  if (type === 'INCOME') {
    return reverse
      ? balanceNumber - amountNumber
      : balanceNumber + amountNumber;
  } else {
    return reverse
      ? balanceNumber + amountNumber
      : balanceNumber - amountNumber;
  }
};
