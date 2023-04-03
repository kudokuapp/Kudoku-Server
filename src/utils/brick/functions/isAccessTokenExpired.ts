import { AxiosError } from 'axios';
import { getAccountDetail } from './getAccountDetail';

/**
 * @description: Check if Brick's access token for a particular user is expired.
 *
 * @param accessToken
 * @returns {boolean} @description: true - if expired
 */
export async function isAccessTokenIsExpired(
  accessToken: string
): Promise<Boolean> {
  return new Promise(async (resolve, reject) => {
    await getAccountDetail(accessToken).catch(async (e) => {
      const error = e as AxiosError;

      if (error.response?.status === 401) {
        resolve(true);
      } else {
        reject();
      }
    });

    resolve(false);
  });
}
