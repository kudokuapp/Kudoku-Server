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
