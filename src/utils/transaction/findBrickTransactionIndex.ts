/**
 * This function is used for finding the index of an incoming array of transactions from Brick.
 * This is useful for refreshing transaction data.
 *
 * @param {string} referenceId The referenceId from our database.
 * @param {BrickTransactionData[]} array The incoming array of transactions from brick
 * @returns {number} The index of which the array is new transaction.
 */
export default function findBrickTransactionIndex(
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
