import axios from 'axios';
import brickUrl from './url';

export default async function getAccountDetail(
  accessToken: string
): Promise<BrickAccountDetail[]> {
  const url = brickUrl(`/v1/account/list`);

  const options = {
    method: 'GET',
    url: url.href,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  };

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const {
          data: { data },
        }: { data: { data: BrickAccountDetail[] } } = await axios.request(
          options
        );

        resolve(data);
      } catch (e) {
        reject(e);
      }
    })();
  });
}
