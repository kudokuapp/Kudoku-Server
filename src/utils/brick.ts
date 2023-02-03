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

export async function getAccountDetail(
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
