/**
 * This function takes in a balance, an amount, a direction, and a reverse flag, and updates the balance based on the amount and direction of the transaction.
 * The direction can either be 'IN' or 'OUT', while the reverse flag determines whether to subtract or add the amount to the balance. The function returns the updated balance as a number.
 *
 * @param {Object} balance, amount, direction, reverse - An object with the following properties:
 * @param {string} balance - The current balance to be updated.
 * @param {string} amount - The amount of the transaction.
 * @param {string} direction - The direction of the transaction, either 'IN' or 'OUT'.
 * @param {boolean} reverse - A flag indicating whether to subtract or add the amount to the balance.
 * @returns {number} The updated balance after the transaction.
 */
export function updateBalance({
  balance,
  amount,
  direction,
  reverse,
}: {
  balance: string;
  amount: string;
  direction: 'IN' | 'OUT';
  reverse: boolean;
}) {
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
}
