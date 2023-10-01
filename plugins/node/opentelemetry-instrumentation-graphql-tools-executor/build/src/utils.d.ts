import type * as graphqlTypes from 'graphql';
import * as api from '@opentelemetry/api';
import { OtelPatched, Maybe } from './internal-types';
import { GraphQLToolsExecutorInstrumentationConfig } from './types';
export { isPromise, addInputVariableAttributes, addSpanSource, endSpan, getOperation, wrapFields, } from '@opentelemetry/instrumentation-graphql/build/src/utils';
export declare function wrapFieldResolver<TSource = any, TContext = any, TArgs = any>(tracer: api.Tracer, getConfig: () => Required<GraphQLToolsExecutorInstrumentationConfig>, fieldResolver: Maybe<graphqlTypes.GraphQLFieldResolver<TSource, TContext, TArgs> & OtelPatched>, isDefaultResolver?: boolean): graphqlTypes.GraphQLFieldResolver<TSource, TContext, TArgs> & OtelPatched;
//# sourceMappingURL=utils.d.ts.map