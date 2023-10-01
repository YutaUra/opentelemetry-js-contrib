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
exports.graphql = void 0;
const executor_1 = require("@graphql-tools/executor");
const graphql_1 = require("graphql");
const graphql = (args) => (0, executor_1.normalizedExecutor)({
    schema: args.schema,
    document: (0, graphql_1.parse)(args.source),
    variableValues: args.variableValues,
    rootValue: args.rootValue,
    fieldResolver: args.fieldResolver,
    operationName: args.operationName,
});
exports.graphql = graphql;
//# sourceMappingURL=graphql-adaptor.js.map