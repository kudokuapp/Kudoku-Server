const brickPublicAccessToken =
  process.env.NODE_ENV === 'production'
    ? process.env.BRICK_PRODUCTION_PUBLIC_ACCESS_TOKEN
    : process.env.BRICK_SANDBOX_PUBLIC_ACCESS_TOKEN;

export default brickPublicAccessToken;
