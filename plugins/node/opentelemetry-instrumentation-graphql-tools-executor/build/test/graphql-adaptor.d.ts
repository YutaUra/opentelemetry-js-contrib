import { GraphQLFieldResolver, GraphQLSchema } from 'graphql';
export declare const graphql: (args: {
    schema: GraphQLSchema;
    source: string;
    variableValues?: Record<string, unknown>;
    rootValue?: unknown;
    fieldResolver?: GraphQLFieldResolver<unknown, unknown>;
    operationName?: string;
}) => import("@graphql-tools/utils").MaybePromise<import("@graphql-tools/utils").MaybeAsyncIterable<import("@graphql-tools/utils").ExecutionResult<any, any>>>;
//# sourceMappingURL=graphql-adaptor.d.ts.map