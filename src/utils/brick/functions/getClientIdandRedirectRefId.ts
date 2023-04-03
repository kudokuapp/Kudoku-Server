import axios from 'axios';
import { brickPublicAccessToken } from './publicAccessToken';
import { brickUrl } from './brickUrl';

export async function getClientIdandRedirectRefId(
  userId: string
): Promise<BrickGetClientIdandRedirectRefId> {
  const url = brickUrl('/v1/auth/token');

  const redirectUrl = 'https://app.kudoku.id';

  const options = {
    method: 'POST',
    url: url.href,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${brickPublicAccessToken}`,
    },
    data: {
      accessToken: brickPublicAccessToken,
      userId,
      redirectUrl,
    },
  };

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const response = await axios.request(options);
        resolve(response.data.data as BrickGetClientIdandRedirectRefId);
      } catch (e) {
        reject(e);
      }
    })();
  });
}
