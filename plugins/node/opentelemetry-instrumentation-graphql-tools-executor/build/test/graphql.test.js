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
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const api_1 = require("@opentelemetry/api");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const assert = require("assert");
const src_1 = require("../src");
const enum_1 = require("../src/enum");
const AttributeNames_1 = require("../src/enums/AttributeNames");
const helper_1 = require("./helper");
const defaultConfig = {};
const graphQLToolsExecutorInstrumentation = new src_1.GraphQLToolsExecutorInstrumentation(defaultConfig);
graphQLToolsExecutorInstrumentation.enable();
graphQLToolsExecutorInstrumentation.disable();
// now graphql can be required
const graphql_1 = require("graphql");
const schema_1 = require("./schema");
const graphql_adaptor_1 = require("./graphql-adaptor");
// Construct a schema, using GraphQL schema language
const schema = (0, schema_1.buildTestSchema)();
const sourceList1 = `
  query {
    books {
      name
    }
  }
`;
const sourceBookById = `
  query {
    book(id: 0) {
      name
    }
  }
`;
const sourceAddBook = `
  mutation AddBook {
    addBook(
      name: "Fifth Book"
      authorIds: "0,2"
    ) {
      id
    }
  }
`;
const sourceFindUsingVariable = `
  query Query1 ($id: Int!) {
    book(id: $id) {
      name
    }
  }
`;
const badQuery = `
  query foo bar
`;
const queryInvalid = `
  query {
    book(id: "a") {
      name
    }
  }
`;
const exporter = new sdk_trace_base_1.InMemorySpanExporter();
const provider = new sdk_trace_base_1.BasicTracerProvider();
provider.addSpanProcessor(new sdk_trace_base_1.SimpleSpanProcessor(exporter));
graphQLToolsExecutorInstrumentation.setTracerProvider(provider);
describe('graphql', () => {
    function create(config = {}) {
        graphQLToolsExecutorInstrumentation.setConfig(config);
        graphQLToolsExecutorInstrumentation.enable();
    }
    describe('when depth is not set', () => {
        describe('AND source is query to get a list of books', () => {
            let spans;
            beforeEach(async () => {
                create({});
                await (0, graphql_adaptor_1.graphql)({ schema, source: sourceList1 });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 5 spans', () => {
                assert.deepStrictEqual(spans.length, 5);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[4];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  query {\n' +
                    '    books {\n' +
                    '      name\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], undefined);
                assert.deepStrictEqual(executeSpan.name, 'query');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
            it('should instrument resolvers', () => {
                const executeSpan = spans[4];
                const resolveParentSpan = spans[0];
                const span1 = spans[1];
                const span2 = spans[2];
                const span3 = spans[3];
                (0, helper_1.assertResolveSpan)(resolveParentSpan, 'books', 'books', '[Book]', 'books {\n' + '      name\n' + '    }', executeSpan.spanContext().spanId);
                const parentId = resolveParentSpan.spanContext().spanId;
                (0, helper_1.assertResolveSpan)(span1, 'name', 'books.0.name', 'String', 'name', parentId);
                (0, helper_1.assertResolveSpan)(span2, 'name', 'books.1.name', 'String', 'name', parentId);
                (0, helper_1.assertResolveSpan)(span3, 'name', 'books.2.name', 'String', 'name', parentId);
            });
        });
        describe('AND source is query with param', () => {
            let spans;
            beforeEach(async () => {
                create({});
                await (0, graphql_adaptor_1.graphql)({ schema, source: sourceBookById });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 5 spans', () => {
                assert.deepStrictEqual(spans.length, 3);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[2];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  query {\n' +
                    '    book(id: *) {\n' +
                    '      name\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], undefined);
                assert.deepStrictEqual(executeSpan.name, 'query');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
            it('should instrument resolvers', () => {
                const executeSpan = spans[2];
                const resolveParentSpan = spans[0];
                const span1 = spans[1];
                (0, helper_1.assertResolveSpan)(resolveParentSpan, 'book', 'book', 'Book', 'book(id: *) {\n' + '      name\n' + '    }', executeSpan.spanContext().spanId);
                const parentId = resolveParentSpan.spanContext().spanId;
                (0, helper_1.assertResolveSpan)(span1, 'name', 'book.name', 'String', 'name', parentId);
            });
        });
        describe('AND source is query with param and variables', () => {
            let spans;
            beforeEach(async () => {
                create({});
                await (0, graphql_adaptor_1.graphql)({
                    schema,
                    source: sourceFindUsingVariable,
                    variableValues: {
                        id: 2,
                    },
                });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 5 spans', () => {
                assert.deepStrictEqual(spans.length, 3);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[2];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  query Query1 ($id: Int!) {\n' +
                    '    book(id: $id) {\n' +
                    '      name\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], 'Query1');
                assert.deepStrictEqual(executeSpan.attributes[`${AttributeNames_1.AttributeNames.VARIABLES}id`], undefined);
                assert.deepStrictEqual(executeSpan.name, 'query Query1');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
            it('should instrument resolvers', () => {
                const executeSpan = spans[2];
                const resolveParentSpan = spans[0];
                const span1 = spans[1];
                (0, helper_1.assertResolveSpan)(resolveParentSpan, 'book', 'book', 'Book', 'book(id: $id) {\n' + '      name\n' + '    }', executeSpan.spanContext().spanId);
                const parentId = resolveParentSpan.spanContext().spanId;
                (0, helper_1.assertResolveSpan)(span1, 'name', 'book.name', 'String', 'name', parentId);
            });
        });
    });
    describe('when depth is set to 0', () => {
        describe('AND source is query to get a list of books', () => {
            let spans;
            beforeEach(async () => {
                create({
                    depth: 0,
                });
                await (0, graphql_adaptor_1.graphql)({ schema, source: sourceList1 });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 3 spans', () => {
                assert.deepStrictEqual(spans.length, 1);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[0];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  query {\n' +
                    '    books {\n' +
                    '      name\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], undefined);
                assert.deepStrictEqual(executeSpan.name, 'query');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
        });
    });
    describe('when mergeItems is set to true', () => {
        describe('AND source is query to get a list of books', () => {
            let spans;
            beforeEach(async () => {
                create({
                    mergeItems: true,
                });
                await (0, graphql_adaptor_1.graphql)({ schema, source: sourceList1 });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 5 spans', () => {
                assert.deepStrictEqual(spans.length, 3);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[2];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  query {\n' +
                    '    books {\n' +
                    '      name\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], undefined);
                assert.deepStrictEqual(executeSpan.name, 'query');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
        });
        describe('AND depth is set to 0', () => {
            let spans;
            beforeEach(async () => {
                create({
                    mergeItems: true,
                    depth: 0,
                });
                await (0, graphql_adaptor_1.graphql)({ schema, source: sourceList1 });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 3 spans', () => {
                assert.deepStrictEqual(spans.length, 1);
            });
        });
    });
    describe('when ignoreTrivialResolveSpans is set to true', () => {
        beforeEach(() => {
            create({
                ignoreTrivialResolveSpans: true,
            });
        });
        afterEach(() => {
            exporter.reset();
            graphQLToolsExecutorInstrumentation.disable();
        });
        it('should create span for resolver defined on schema', async () => {
            const simpleSchemaWithResolver = new graphql_1.GraphQLSchema({
                query: new graphql_1.GraphQLObjectType({
                    name: 'RootQueryType',
                    fields: {
                        hello: {
                            type: graphql_1.GraphQLString,
                            resolve() {
                                return 'world';
                            },
                        },
                    },
                }),
            });
            await (0, graphql_adaptor_1.graphql)({ schema: simpleSchemaWithResolver, source: '{ hello }' });
            const resovleSpans = exporter
                .getFinishedSpans()
                .filter(span => span.name === enum_1.SpanNames.RESOLVE);
            assert.deepStrictEqual(resovleSpans.length, 1);
            const resolveSpan = resovleSpans[0];
            assert(resolveSpan.attributes[AttributeNames_1.AttributeNames.FIELD_PATH] === 'hello');
        });
        it('should create span for resolver function', async () => {
            const schema = (0, graphql_1.buildSchema)(`
        type Query {
          hello: String
        }
      `);
            const rootValue = {
                hello: () => 'world',
            };
            await (0, graphql_adaptor_1.graphql)({ schema, source: '{ hello }', rootValue });
            const resovleSpans = exporter
                .getFinishedSpans()
                .filter(span => span.name === enum_1.SpanNames.RESOLVE);
            assert.deepStrictEqual(resovleSpans.length, 1);
            const resolveSpan = resovleSpans[0];
            assert(resolveSpan.attributes[AttributeNames_1.AttributeNames.FIELD_PATH] === 'hello');
        });
        it('should NOT create span for resolver property', async () => {
            const schema = (0, graphql_1.buildSchema)(`
        type Query {
          hello: String
        }
      `);
            const rootValue = {
                hello: 'world', // regular property, not a function
            };
            await (0, graphql_adaptor_1.graphql)({ schema, source: '{ hello }', rootValue });
            const resovleSpans = exporter
                .getFinishedSpans()
                .filter(span => span.name === enum_1.SpanNames.RESOLVE);
            assert.deepStrictEqual(resovleSpans.length, 0);
        });
        it('should create resolve span for custom field resolver', async () => {
            const schema = (0, graphql_1.buildSchema)(`
        type Query {
          hello: String
        }
      `);
            const rootValue = {
                hello: 'world', // regular property, not a function
            };
            // since we use a custom field resolver, we record a span
            // even though the field is a property
            const fieldResolver = (source, args, context, info) => {
                return source[info.fieldName];
            };
            await (0, graphql_adaptor_1.graphql)({ schema, source: '{ hello }', rootValue, fieldResolver });
            const resovleSpans = exporter
                .getFinishedSpans()
                .filter(span => span.name === enum_1.SpanNames.RESOLVE);
            assert.deepStrictEqual(resovleSpans.length, 1);
            const resolveSpan = resovleSpans[0];
            assert(resolveSpan.attributes[AttributeNames_1.AttributeNames.FIELD_PATH] === 'hello');
        });
    });
    describe('when allowValues is set to true', () => {
        describe('AND source is query with param', () => {
            let spans;
            beforeEach(async () => {
                create({
                    allowValues: true,
                });
                await (0, graphql_adaptor_1.graphql)({ schema, source: sourceBookById });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 5 spans', () => {
                assert.deepStrictEqual(spans.length, 3);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[2];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  query {\n' +
                    '    book(id: 0) {\n' +
                    '      name\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], undefined);
                assert.deepStrictEqual(executeSpan.name, 'query');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
            it('should instrument resolvers', () => {
                const executeSpan = spans[2];
                const resolveParentSpan = spans[0];
                const span1 = spans[1];
                (0, helper_1.assertResolveSpan)(resolveParentSpan, 'book', 'book', 'Book', 'book(id: 0) {\n' + '      name\n' + '    }', executeSpan.spanContext().spanId);
                const parentId = resolveParentSpan.spanContext().spanId;
                (0, helper_1.assertResolveSpan)(span1, 'name', 'book.name', 'String', 'name', parentId);
            });
        });
        describe('AND mutation is called', () => {
            let spans;
            beforeEach(async () => {
                create({
                    allowValues: true,
                });
                await (0, graphql_adaptor_1.graphql)({ schema, source: sourceAddBook });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 3 spans', () => {
                assert.deepStrictEqual(spans.length, 3);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[2];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  mutation AddBook {\n' +
                    '    addBook(\n' +
                    '      name: "Fifth Book"\n' +
                    '      authorIds: "0,2"\n' +
                    '    ) {\n' +
                    '      id\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'mutation');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], 'AddBook');
                assert.deepStrictEqual(executeSpan.name, 'mutation AddBook');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
            it('should instrument resolvers', () => {
                const executeSpan = spans[2];
                const resolveParentSpan = spans[0];
                const span1 = spans[1];
                (0, helper_1.assertResolveSpan)(resolveParentSpan, 'addBook', 'addBook', 'Book', 'addBook(\n' +
                    '      name: "Fifth Book"\n' +
                    '      authorIds: "0,2"\n' +
                    '    ) {\n' +
                    '      id\n' +
                    '    }', executeSpan.spanContext().spanId);
                const parentId = resolveParentSpan.spanContext().spanId;
                (0, helper_1.assertResolveSpan)(span1, 'id', 'addBook.id', 'Int', 'id', parentId);
            });
        });
        describe('AND source is query with param and variables', () => {
            let spans;
            beforeEach(async () => {
                create({
                    allowValues: true,
                });
                await (0, graphql_adaptor_1.graphql)({
                    schema,
                    source: sourceFindUsingVariable,
                    variableValues: {
                        id: 2,
                    },
                });
                spans = exporter.getFinishedSpans();
            });
            afterEach(() => {
                exporter.reset();
                graphQLToolsExecutorInstrumentation.disable();
                spans = [];
            });
            it('should have 3 spans', () => {
                assert.deepStrictEqual(spans.length, 3);
            });
            it('should instrument execute', () => {
                const executeSpan = spans[2];
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                    '  query Query1 ($id: Int!) {\n' +
                    '    book(id: $id) {\n' +
                    '      name\n' +
                    '    }\n' +
                    '  }\n');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
                assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], 'Query1');
                assert.deepStrictEqual(executeSpan.attributes[`${AttributeNames_1.AttributeNames.VARIABLES}id`], 2);
                assert.deepStrictEqual(executeSpan.name, 'query Query1');
                assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
            });
            it('should instrument resolvers', () => {
                const executeSpan = spans[2];
                const resolveParentSpan = spans[0];
                const span1 = spans[1];
                (0, helper_1.assertResolveSpan)(resolveParentSpan, 'book', 'book', 'Book', 'book(id: $id) {\n' + '      name\n' + '    }', executeSpan.spanContext().spanId);
                const parentId = resolveParentSpan.spanContext().spanId;
                (0, helper_1.assertResolveSpan)(span1, 'name', 'book.name', 'String', 'name', parentId);
            });
        });
    });
    describe('when mutation is called', () => {
        let spans;
        beforeEach(async () => {
            create({
            // allowValues: true
            });
            await (0, graphql_adaptor_1.graphql)({ schema, source: sourceAddBook });
            spans = exporter.getFinishedSpans();
        });
        afterEach(() => {
            exporter.reset();
            graphQLToolsExecutorInstrumentation.disable();
            spans = [];
        });
        it('should have 3 spans', () => {
            assert.deepStrictEqual(spans.length, 3);
        });
        it('should instrument execute', () => {
            const executeSpan = spans[2];
            assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                '  mutation AddBook {\n' +
                '    addBook(\n' +
                '      name: "*"\n' +
                '      authorIds: "*"\n' +
                '    ) {\n' +
                '      id\n' +
                '    }\n' +
                '  }\n');
            assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'mutation');
            assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], 'AddBook');
            assert.deepStrictEqual(executeSpan.name, 'mutation AddBook');
            assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
        });
        it('should instrument resolvers', () => {
            const executeSpan = spans[2];
            const resolveParentSpan = spans[0];
            const span1 = spans[1];
            (0, helper_1.assertResolveSpan)(resolveParentSpan, 'addBook', 'addBook', 'Book', 'addBook(\n' +
                '      name: "*"\n' +
                '      authorIds: "*"\n' +
                '    ) {\n' +
                '      id\n' +
                '    }', executeSpan.spanContext().spanId);
            const parentId = resolveParentSpan.spanContext().spanId;
            (0, helper_1.assertResolveSpan)(span1, 'id', 'addBook.id', 'Int', 'id', parentId);
        });
    });
    describe.skip('when query is not correct', () => {
        let spans;
        beforeEach(async () => {
            create({});
            await (0, graphql_adaptor_1.graphql)({ schema, source: badQuery });
            spans = exporter.getFinishedSpans();
        });
        afterEach(() => {
            exporter.reset();
            graphQLToolsExecutorInstrumentation.disable();
            spans = [];
        });
        it('should have 1 span', () => {
            assert.deepStrictEqual(spans.length, 1);
        });
    });
    describe.skip('when query is correct but cannot be validated', () => {
        let spans;
        beforeEach(async () => {
            create({});
            await (0, graphql_adaptor_1.graphql)({ schema, source: queryInvalid });
            spans = exporter.getFinishedSpans();
        });
        afterEach(() => {
            exporter.reset();
            graphQLToolsExecutorInstrumentation.disable();
            spans = [];
        });
        it('should have 2 spans', () => {
            assert.deepStrictEqual(spans.length, 2);
        });
    });
    describe('responseHook', () => {
        let spans;
        let graphqlResult;
        const dataAttributeName = 'graphql_data';
        afterEach(() => {
            exporter.reset();
            graphQLToolsExecutorInstrumentation.disable();
            spans = [];
        });
        describe('when responseHook is valid', () => {
            beforeEach(async () => {
                create({
                    responseHook: (span, data) => {
                        span.setAttribute(dataAttributeName, JSON.stringify(data));
                    },
                });
                const mayBeAsyncIterableResult = await (0, graphql_adaptor_1.graphql)({
                    schema,
                    source: sourceList1,
                });
                if (Symbol.asyncIterator in mayBeAsyncIterableResult) {
                    throw new Error('Expected a synchronous result');
                }
                graphqlResult =
                    mayBeAsyncIterableResult;
                spans = exporter.getFinishedSpans();
            });
            it('should attach response hook data to the resulting spans', () => {
                const querySpan = spans.find(span => span.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE] === 'query');
                const instrumentationResult = querySpan === null || querySpan === void 0 ? void 0 : querySpan.attributes[dataAttributeName];
                assert.deepStrictEqual(instrumentationResult, JSON.stringify(graphqlResult));
            });
        });
        describe('when responseHook throws an error', () => {
            beforeEach(async () => {
                create({
                    responseHook: (_span, _data) => {
                        throw 'some kind of failure!';
                    },
                });
                const mayBeAsyncIterableResult = await (0, graphql_adaptor_1.graphql)({
                    schema,
                    source: sourceList1,
                });
                if (Symbol.asyncIterator in mayBeAsyncIterableResult) {
                    throw new Error('Expected a synchronous result');
                }
                graphqlResult =
                    mayBeAsyncIterableResult;
                spans = exporter.getFinishedSpans();
            });
            it('should not do any harm', () => {
                var _a, _b;
                assert.deepStrictEqual((_b = (_a = graphqlResult.data) === null || _a === void 0 ? void 0 : _a.books) === null || _b === void 0 ? void 0 : _b.length, 9);
            });
        });
        describe('when responseHook is not a function', () => {
            beforeEach(async () => {
                // Cast to unknown so that it's possible to cast to GraphQLInstrumentationExecutionResponseHook later
                const invalidTypeHook = 1234;
                create({
                    responseHook: invalidTypeHook,
                });
                const mayBeAsyncIterableResult = await (0, graphql_adaptor_1.graphql)({
                    schema,
                    source: sourceList1,
                });
                if (Symbol.asyncIterator in mayBeAsyncIterableResult) {
                    throw new Error('Expected a synchronous result');
                }
                graphqlResult =
                    mayBeAsyncIterableResult;
                spans = exporter.getFinishedSpans();
            });
            it('should not do any harm', () => {
                var _a, _b;
                assert.deepStrictEqual((_b = (_a = graphqlResult.data) === null || _a === void 0 ? void 0 : _a.books) === null || _b === void 0 ? void 0 : _b.length, 9);
            });
        });
    });
    describe.skip('when query operation is not supported', () => {
        let spans;
        beforeEach(async () => {
            create({});
            await (0, graphql_adaptor_1.graphql)({
                schema,
                source: sourceBookById,
                operationName: 'foo',
            });
            spans = exporter.getFinishedSpans();
        });
        afterEach(() => {
            exporter.reset();
            graphQLToolsExecutorInstrumentation.disable();
            spans = [];
        });
        it('should have 3 spans', () => {
            assert.deepStrictEqual(spans.length, 3);
        });
        it('should instrument execute', () => {
            const executeSpan = spans[2];
            assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], '\n' +
                '  query {\n' +
                '    book(id: *) {\n' +
                '      name\n' +
                '    }\n' +
                '  }\n');
            assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_NAME], 'Operation "foo" not supported');
            assert.deepStrictEqual(executeSpan.name, enum_1.SpanNames.EXECUTE);
            assert.deepStrictEqual(executeSpan.parentSpanId, undefined);
        });
    });
    describe.skip('graphqlSync', () => {
        const simpleSyncSchema = (0, graphql_1.buildSchema)(`
      type Query {
        hello: String
      }
    `);
        beforeEach(() => {
            create({});
        });
        afterEach(() => {
            exporter.reset();
        });
        it('should instrument successful graphqlSync', () => {
            const rootValue = {
                hello: () => 'Hello world!',
            };
            const source = '{ hello }';
            const res = (0, graphql_1.graphqlSync)({ schema: simpleSyncSchema, rootValue, source });
            assert.deepEqual(res.data, { hello: 'Hello world!' });
            // validate execute span is present
            const spans = exporter.getFinishedSpans();
            const executeSpans = spans.filter(s => s.name === 'query');
            assert.deepStrictEqual(executeSpans.length, 1);
            const [executeSpan] = executeSpans;
            assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.SOURCE], source);
            assert.deepStrictEqual(executeSpan.attributes[AttributeNames_1.AttributeNames.OPERATION_TYPE], 'query');
        });
        it('should instrument when sync resolver throws', () => {
            var _a, _b, _c;
            const rootValue = {
                hello: () => {
                    throw Error('sync resolver error from tests');
                },
            };
            const source = '{ hello }';
            // graphql will not throw, it will return "errors" in the result and the field will be null
            const res = (0, graphql_1.graphqlSync)({ schema: simpleSyncSchema, rootValue, source });
            assert.deepEqual(res.data, { hello: null });
            // assert errors are returned correctly
            assert.deepStrictEqual((_a = res.errors) === null || _a === void 0 ? void 0 : _a.length, 1);
            const resolverError = (_b = res.errors) === null || _b === void 0 ? void 0 : _b[0];
            assert.deepStrictEqual(resolverError.path, ['hello']);
            assert.deepStrictEqual(resolverError.message, 'sync resolver error from tests');
            // assert relevant spans are still created with error indications
            const spans = exporter.getFinishedSpans();
            // single resolve span with error and event for exception
            const resolveSpans = spans.filter(s => s.name === enum_1.SpanNames.RESOLVE);
            assert.deepStrictEqual(resolveSpans.length, 1);
            const resolveSpan = resolveSpans[0];
            assert.deepStrictEqual(resolveSpan.status.code, api_1.SpanStatusCode.ERROR);
            assert.deepStrictEqual(resolveSpan.status.message, 'sync resolver error from tests');
            const resolveEvent = resolveSpan.events[0];
            assert.deepStrictEqual(resolveEvent.name, 'exception');
            assert.deepStrictEqual((_c = resolveEvent.attributes) === null || _c === void 0 ? void 0 : _c[semantic_conventions_1.SemanticAttributes.EXCEPTION_MESSAGE], 'sync resolver error from tests');
            // single execute span
            const executeSpans = spans.filter(s => s.name === 'query');
            assert.deepStrictEqual(executeSpans.length, 1);
        });
    });
});
//# sourceMappingURL=graphql.test.js.map