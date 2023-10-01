import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import type * as graphqlTypes from 'graphql';
import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import type * as executor from '@graphql-tools/executor';
import { GraphQLToolsExecutorInstrumentationConfig } from './types';
export type { executeArgumentsArray, OtelExecutionArgs, Maybe, GraphQLPath, OtelPatched, ObjectWithGraphQLData, GraphQLField, } from '@opentelemetry/instrumentation-graphql/build/src/internal-types';
import type { Maybe } from '@opentelemetry/instrumentation-graphql/build/src/internal-types';
export { OPERATION_NOT_SUPPORTED } from '@opentelemetry/instrumentation-graphql/build/src/internal-types';
/**
 * Merged and parsed config of default instrumentation config and GraphQL
 */
export declare type GraphQLInstrumentationParsedConfig = Required<GraphQLToolsExecutorInstrumentationConfig> & InstrumentationConfig;
export declare type executeFunctionWithObj = (args: executor.ExecutionArgs) => PromiseOrValue<executor.SingularExecutionResult>;
export declare type executeFunctionWithArgs = (schema: graphqlTypes.GraphQLSchema, document: graphqlTypes.DocumentNode, rootValue?: any, contextValue?: any, variableValues?: Maybe<{
    [key: string]: any;
}>, operationName?: Maybe<string>, fieldResolver?: Maybe<graphqlTypes.GraphQLFieldResolver<any, any>>, typeResolver?: Maybe<graphqlTypes.GraphQLTypeResolver<any, any>>) => PromiseOrValue<executor.SingularExecutionResult>;
export declare type executeType = executeFunctionWithObj | executeFunctionWithArgs;
//# sourceMappingURL=internal-types.d.ts.map