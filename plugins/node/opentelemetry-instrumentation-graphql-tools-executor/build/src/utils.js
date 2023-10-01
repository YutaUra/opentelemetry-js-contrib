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
exports.wrapFieldResolver = exports.wrapFields = exports.getOperation = exports.endSpan = exports.addSpanSource = exports.addInputVariableAttributes = exports.isPromise = void 0;
const api = require("@opentelemetry/api");
const enum_1 = require("./enum");
const AttributeNames_1 = require("./enums/AttributeNames");
const symbols_1 = require("./symbols");
var utils_1 = require("@opentelemetry/instrumentation-graphql/build/src/utils");
Object.defineProperty(exports, "isPromise", { enumerable: true, get: function () { return utils_1.isPromise; } });
Object.defineProperty(exports, "addInputVariableAttributes", { enumerable: true, get: function () { return utils_1.addInputVariableAttributes; } });
Object.defineProperty(exports, "addSpanSource", { enumerable: true, get: function () { return utils_1.addSpanSource; } });
Object.defineProperty(exports, "endSpan", { enumerable: true, get: function () { return utils_1.endSpan; } });
Object.defineProperty(exports, "getOperation", { enumerable: true, get: function () { return utils_1.getOperation; } });
Object.defineProperty(exports, "wrapFields", { enumerable: true, get: function () { return utils_1.wrapFields; } });
const utils_2 = require("@opentelemetry/instrumentation-graphql/build/src/utils");
// https://github.com/graphql/graphql-js/blob/main/src/jsutils/isObjectLike.ts
const isObjectLike = (value) => {
    return typeof value == 'object' && value !== null;
};
function createFieldIfNotExists(tracer, getConfig, contextValue, info, path) {
    let field = getField(contextValue, path);
    let spanAdded = false;
    if (!field) {
        spanAdded = true;
        const parent = getParentField(contextValue, path);
        field = {
            parent,
            span: createResolverSpan(tracer, getConfig, contextValue, info, path, parent.span),
            error: null,
        };
        addField(contextValue, path, field);
    }
    return { spanAdded, field };
}
function createResolverSpan(tracer, getConfig, contextValue, info, path, parentSpan) {
    var _a, _b;
    const attributes = {
        [AttributeNames_1.AttributeNames.FIELD_NAME]: info.fieldName,
        [AttributeNames_1.AttributeNames.FIELD_PATH]: path.join('.'),
        [AttributeNames_1.AttributeNames.FIELD_TYPE]: info.returnType.toString(),
    };
    const span = tracer.startSpan(enum_1.SpanNames.RESOLVE, {
        attributes,
    }, parentSpan ? api.trace.setSpan(api.context.active(), parentSpan) : undefined);
    const document = contextValue[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL].source;
    const fieldNode = info.fieldNodes.find(fieldNode => fieldNode.kind === 'Field');
    if (fieldNode) {
        (0, utils_2.addSpanSource)(span, document.loc, getConfig().allowValues, (_a = fieldNode.loc) === null || _a === void 0 ? void 0 : _a.start, (_b = fieldNode.loc) === null || _b === void 0 ? void 0 : _b.end);
    }
    return span;
}
function addField(contextValue, path, field) {
    return (contextValue[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL].fields[path.join('.')] =
        field);
}
function getField(contextValue, path) {
    return contextValue[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL].fields[path.join('.')];
}
function getParentField(contextValue, path) {
    for (let i = path.length - 1; i > 0; i--) {
        const field = getField(contextValue, path.slice(0, i));
        if (field) {
            return field;
        }
    }
    return {
        span: contextValue[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL].span,
    };
}
function pathToArray(mergeItems, path) {
    const flattened = [];
    let curr = path;
    while (curr) {
        let key = curr.key;
        if (mergeItems && typeof key === 'number') {
            key = '*';
        }
        flattened.push(String(key));
        curr = curr.prev;
    }
    return flattened.reverse();
}
const handleResolveSpanError = (resolveSpan, err, shouldEndSpan) => {
    if (!shouldEndSpan) {
        return;
    }
    resolveSpan.recordException(err);
    resolveSpan.setStatus({
        code: api.SpanStatusCode.ERROR,
        message: err.message,
    });
    resolveSpan.end();
};
const handleResolveSpanSuccess = (resolveSpan, shouldEndSpan) => {
    if (!shouldEndSpan) {
        return;
    }
    resolveSpan.end();
};
function wrapFieldResolver(tracer, getConfig, fieldResolver, isDefaultResolver = false) {
    if (wrappedFieldResolver[symbols_1.OTEL_PATCHED_SYMBOL] ||
        typeof fieldResolver !== 'function') {
        return fieldResolver;
    }
    function wrappedFieldResolver(source, args, contextValue, info) {
        if (!fieldResolver) {
            return undefined;
        }
        const config = getConfig();
        // follows what graphql is doing to decied if this is a trivial resolver
        // for which we don't need to create a resolve span
        if (config.ignoreTrivialResolveSpans &&
            isDefaultResolver &&
            (isObjectLike(source) || typeof source === 'function')) {
            const property = source[info.fieldName];
            // a function execution is not trivial and should be recorder.
            // property which is not a function is just a value and we don't want a "resolve" span for it
            if (typeof property !== 'function') {
                return fieldResolver.call(this, source, args, contextValue, info);
            }
        }
        if (!contextValue[symbols_1.OTEL_GRAPHQL_DATA_SYMBOL]) {
            return fieldResolver.call(this, source, args, contextValue, info);
        }
        const path = pathToArray(config.mergeItems, info && info.path);
        const depth = path.filter((item) => typeof item === 'string').length;
        let field;
        let shouldEndSpan = false;
        if (config.depth >= 0 && config.depth < depth) {
            field = getParentField(contextValue, path);
        }
        else {
            const newField = createFieldIfNotExists(tracer, getConfig, contextValue, info, path);
            field = newField.field;
            shouldEndSpan = newField.spanAdded;
        }
        return api.context.with(api.trace.setSpan(api.context.active(), field.span), () => {
            try {
                const res = fieldResolver.call(this, source, args, contextValue, info);
                if ((0, utils_2.isPromise)(res)) {
                    return res.then((r) => {
                        handleResolveSpanSuccess(field.span, shouldEndSpan);
                        return r;
                    }, (err) => {
                        handleResolveSpanError(field.span, err, shouldEndSpan);
                        throw err;
                    });
                }
                else {
                    handleResolveSpanSuccess(field.span, shouldEndSpan);
                    return res;
                }
            }
            catch (err) {
                handleResolveSpanError(field.span, err, shouldEndSpan);
                throw err;
            }
        });
    }
    wrappedFieldResolver[symbols_1.OTEL_PATCHED_SYMBOL] = true;
    return wrappedFieldResolver;
}
exports.wrapFieldResolver = wrapFieldResolver;
//# sourceMappingURL=utils.js.map