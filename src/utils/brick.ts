import 'dotenv/config';

const production = (process.env.NODE_ENV as string) === 'production';
export const BRICK_URI = production
  ? `https://${process.env.BRICK_PROD_URI}`
  : `https://${process.env.BRICK_SANDBOX_URI}`;

const CLIENT_ID = production
  ? (process.env.BRICK_PROD_CLIENT_ID as string)
  : (process.env.BRICK_SANDBOX_CLIENT_ID as string);

const CLIENT_SECRET = production
  ? (process.env.BRICK_PROD_CLIENT_SECRET as string)
  : (process.env.BRICK_SANDBOX_CLIENT_SECRET as string);

export const BRICK_AUTH = {
  // username: CLIENT_ID,
  // password: CLIENT_SECRET,
  username: 'cd144174-2bc1-485d-a1aa-d00be8685b4b',
  password: 'DOqbMLkmtGmE585NYtxbNUFy8vKfnN',
};
