import { ApolloServer } from 'apollo-server';
import { PrismaClient } from '@prisma/client';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageDisabled,
} from 'apollo-server-core';
import { schema } from './schema';
import { context } from './context';

export const server = new ApolloServer({
  schema,
  context,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageLocalDefault(),
  ],
});

const port = (process.env.PORT as unknown as number) || 8080;

server.listen({ port }).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});

const prisma = new PrismaClient();

(async function () {
  await prisma.$connect();
})()
  .then(async () => {
    console.log('prisma connect');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
