import { scalarType } from 'nexus';

export const DateTime = scalarType({
  name: 'DateTime',
  asNexusMethod: 'dateTime',
  description:
    'A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the date-time format.',
  serialize(value) {
    // This function is used to convert the scalar's value as returned by the resolver
    // into a JSON representation that can be returned to the client.
    // In this case, we simply return the value as is.
    return value;
  },
  parseValue(value) {
    // This function is used to parse the scalar's value as provided by the client
    // into a JavaScript representation that can be passed to the resolver.
    // In this case, we simply return the value as is.
    return value;
  },
  parseLiteral(ast) {
    // This function is used to parse the scalar's value as provided by the client
    // into a JavaScript representation that can be passed to the resolver.
    // We check the `kind` property of the AST node to determine its type,
    // and then return the appropriate value based on the type.
    switch (ast.kind) {
      case 'StringValue':
        return ast.value;
      case 'IntValue':
      case 'FloatValue':
        return Number(ast.value);
      default:
        return null;
    }
  },
});
