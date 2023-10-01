"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLToolsExecutorInstrumentation = void 0;
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const enum_1 = require("./enum");
const AttributeNames_1 = require("./enums/AttributeNames");
const symbols_1 = require("./symbols");
const internal_types_1 = require("./internal-types");
const utils_1 = require("./utils");
const version_1 = require("./version");
const api = require("@opentelemetry/api");
const DEFAULT_CONFIG = {
    mergeItems: false,
    depth: -1,
    allowValues: false,
};
const supportedVersions = ['>=1.2'];
class GraphQLToolsExecutorInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super('@opentelemetry/instrumentation-graphql-tools-executor', version_1.VERSION, Object.assign({}, DEFAULT_CONFIG, config));
    }
    _getConfig() {
        return this._config;
    }
    setConfig(config = {}) {
        this._config = Object.assign({}, DEFAULT_CONFIG, config);
    }
    init() {
        const module = new instrumentation_1.InstrumentationNodeModuleDefinition('@graphql-tools/executor', supportedVersions);
        module.files.push(this._addPatchingGraphQLToolsExecutor());
        return module;
    }
    _addPatchingGraphQLToolsExecutor() {
        return new instrumentation_1.InstrumentationNodeModuleFile('@graphql-tools/executor/cjs/execution/execute.js', supportedVersions, moduleExports => {
            if ((0, instrumentation_1.isWrapped)(moduleExports.execute)) {
                this._unwrap(moduleExports, 'execute');
            }
            this._wrap(moduleExports, 'execute', this._patchExecute(moduleExports.defaultFieldResolver));
            return moduleExports;
        }, moduleExports => {
            if (moduleExports) {
                this._unwrap(moduleExports, 'execute');
            }
        });
    }
    _patchExecute(defaultFieldResolved) {
        const instrumentation = this;
        return function execute(original) {
            return function patchExecute() {
                let processedArgs;
                // case when apollo server is used for example
                if (arguments.length >= 2) {
                    const args = arguments;
                    processedArgs = instrumentation._wrapExecuteArgs(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], defaultFieldResolved);
                }
                else {
                    const args = arguments[0];
                    processedArgs = instrumentation._wrapExecuteArgs(args.schema, args.document, args.rootValue, args.contextValue, args.variableValues, args.operationName, args.fieldResolver, args.typeResolver, defaultFieldResolved);
                }
                const operation = (0, utils_1.getOperation)(processedArgs.document, processedArgs.operationName);
                const span = instrumentation._createExecuteSpan(operation, processedArgs);
                processedArgs.contextValue[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL] = {
                    source: processedArgs.document
                        ? processedArgs.document ||
                            processedArgs.document[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL]
                        : undefined,
                    span,
                    fields: {},
                };
                return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => {
                    return (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
                        return original.apply(this, [
                            processedArgs,
                        ]);
                    }, (err, result) => {
                        instrumentation._handleExecutionResult(span, err, result);
                    });
                });
            };
        };
    }
    _handleExecutionResult(span, err, result) {
        const config = this._getConfig();
        if (result === undefined || err) {
            (0, utils_1.endSpan)(span, err);
            return;
        }
        if ((0, utils_1.isPromise)(result)) {
            result.then(resultData => {
                if (typeof config.responseHook !== 'function') {
                    (0, utils_1.endSpan)(span);
                    return;
                }
                this._executeResponseHook(span, resultData);
            }, error => {
                (0, utils_1.endSpan)(span, error);
            });
        }
        else {
            if (typeof config.responseHook !== 'function') {
                (0, utils_1.endSpan)(span);
                return;
            }
            this._executeResponseHook(span, result);
        }
    }
    _executeResponseHook(span, result) {
        const config = this._getConfig();
        (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
            config.responseHook(span, result);
        }, err => {
            if (err) {
                api.diag.error('Error running response hook', err);
            }
            (0, utils_1.endSpan)(span, undefined);
        }, true);
    }
    _createExecuteSpan(operation, processedArgs) {
        var _a;
        const config = this._getConfig();
        const span = this.tracer.startSpan(enum_1.SpanNames.EXECUTE, {});
        if (operation) {
            const { operation: operationType, name: nameNode } = operation;
            span.setAttribute(AttributeNames_1.AttributeNames.OPERATION_TYPE, operationType);
            const operationName = nameNode === null || nameNode === void 0 ? void 0 : nameNode.value;
            // https://opentelemetry.io/docs/reference/specification/trace/semantic_conventions/instrumentation/graphql/
            // > The span name MUST be of the format <graphql.operation.type> <graphql.operation.name> provided that graphql.operation.type and graphql.operation.name are available.
            // > If graphql.operation.name is not available, the span SHOULD be named <graphql.operation.type>.
            if (operationName) {
                span.setAttribute(AttributeNames_1.AttributeNames.OPERATION_NAME, operationName);
                span.updateName(`${operationType} ${operationName}`);
            }
            else {
                span.updateName(operationType);
            }
        }
        else {
            let operationName = ' ';
            if (processedArgs.operationName) {
                operationName = ` "${processedArgs.operationName}" `;
            }
            operationName = internal_types_1.OPERATION_NOT_SUPPORTED.replace('$operationName$', operationName);
            span.setAttribute(AttributeNames_1.AttributeNames.OPERATION_NAME, operationName);
        }
        if ((_a = processedArgs.document) === null || _a === void 0 ? void 0 : _a.loc) {
            (0, utils_1.addSpanSource)(span, processedArgs.document.loc, config.allowValues);
        }
        if (processedArgs.variableValues && config.allowValues) {
            (0, utils_1.addInputVariableAttributes)(span, processedArgs.variableValues);
        }
        return span;
    }
    _wrapExecuteArgs(schema, document, rootValue, contextValue, variableValues, operationName, fieldResolver, typeResolver, defaultFieldResolved) {
        if (!contextValue) {
            contextValue = {};
        }
        if (contextValue[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL]) {
            return {
                schema,
                document,
                rootValue,
                contextValue,
                variableValues,
                operationName,
                fieldResolver,
                typeResolver,
            };
        }
        const isUsingDefaultResolver = fieldResolver == null;
        // follows graphql implementation here:
        // https://github.com/graphql/graphql-js/blob/0b7daed9811731362c71900e12e5ea0d1ecc7f1f/src/execution/execute.ts#L494
        const fieldResolverForExecute = fieldResolver !== null && fieldResolver !== void 0 ? fieldResolver : defaultFieldResolved;
        fieldResolver = (0, utils_1.wrapFieldResolver)(this.tracer, this._getConfig.bind(this), fieldResolverForExecute, isUsingDefaultResolver);
        if (schema) {
            (0, utils_1.wrapFields)(schema.getQueryType(), this.tracer, this._getConfig.bind(this));
            (0, utils_1.wrapFields)(schema.getMutationType(), this.tracer, this._getConfig.bind(this));
        }
        return {
            schema,
            document,
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver,
            typeResolver,
        };
    }
}
exports.GraphQLToolsExecutorInstrumentation = GraphQLToolsExecutorInstrumentation;
//# sourceMappingURL=instrumentation.js.map