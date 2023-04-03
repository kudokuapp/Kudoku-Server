/**
 *
 * @param {number} institutionId
 * @returns {string} Kudoku's institution mongoDB ID
 */
export function mapBrickInstitutionIdToKudoku(institutionId: number): string {
  switch (institutionId) {
    case 2:
      return '63d8bb09a2b49c686d736525';

    case 11:
      return '63d94170d3e050940af0caf2';

    case 37:
      return '63d8bb09a2b49c686d736525';

    case 38:
      return '63d8bb09a2b49c686d736525';

    default:
      return '63d8bb09a2b49c686d736525';
  }
}
