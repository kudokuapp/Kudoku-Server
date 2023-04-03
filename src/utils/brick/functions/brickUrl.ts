export function brickUrl(endpoint: string) {
  const host =
    process.env.NODE_ENV === 'production'
      ? 'https://api.onebrick.io'
      : 'https://sandbox.onebrick.io';

  return new URL(endpoint, host);
}
