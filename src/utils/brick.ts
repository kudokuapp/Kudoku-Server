import axios from 'axios';

export function brickUrl(endpoint: string) {
  const host =
    process.env.NODE_ENV === 'production'
      ? 'https://api.onebrick.io'
      : 'https://sandbox.onebrick.io';

  return new URL(endpoint, host);
}

export const brickPublicAccessToken =
  process.env.NODE_ENV === 'production'
    ? process.env.BRICK_PRODUCTION_PUBLIC_ACCESS_TOKEN
    : process.env.BRICK_SANDBOX_PUBLIC_ACCESS_TOKEN;

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
