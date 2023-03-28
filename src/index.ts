import { ApolloServer, BaseContext, ContextFunction } from '@apollo/server';
import { PrismaClient } from '@prisma/client';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { schema } from './schema';
import { context } from './context';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import bodyParser from 'body-parser';
import {
  ExpressContextFunctionArgument,
  expressMiddleware,
} from '@apollo/server/express4';

const app = express();
const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer({ schema, context }, wsServer);

export const server = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageLocalDefault(),
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
  formatError: (error) => {
    const { extensions = {}, message } = error;
    const { status } = extensions;
    return {
      message,
      status,
      extensions: {
        ...extensions,
        code: status || 500,
      },
    };
  },
});

async function startServer() {
  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: context as unknown as ContextFunction<
        [ExpressContextFunctionArgument],
        BaseContext
      >,
    })
  );
}

startServer();

const PORT = (process.env.PORT as unknown as number) || 8080;

httpServer.listen(PORT, () => {
  console.log(`Server is now running on http://localhost:${PORT}/graphql`);
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
