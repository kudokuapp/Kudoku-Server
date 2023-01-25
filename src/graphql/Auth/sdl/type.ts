import { objectType } from 'nexus';

export const AuthPayLoad = objectType({
  name: 'AuthPayLoad',
  definition(t) {
    t.nonNull.string('token', {
      description: 'JWT Token',
    });
  },
});

export const ResponseMessage = objectType({
  name: 'ResponseMessage',
  definition(t) {
    t.string('response', {
      description: 'Response message',
    });
  },
});
