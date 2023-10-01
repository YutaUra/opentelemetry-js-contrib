import { InstrumentationBase, InstrumentationConfig, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { GraphQLToolsExecutorInstrumentationConfig } from './types';
export declare class GraphQLToolsExecutorInstrumentation extends InstrumentationBase {
    constructor(config?: GraphQLToolsExecutorInstrumentationConfig & InstrumentationConfig);
    private _getConfig;
    setConfig(config?: GraphQLToolsExecutorInstrumentationConfig): void;
    protected init(): InstrumentationNodeModuleDefinition<any>;
    private _addPatchingGraphQLToolsExecutor;
    private _patchExecute;
    private _handleExecutionResult;
    private _executeResponseHook;
    private _createExecuteSpan;
    private _wrapExecuteArgs;
}
//# sourceMappingURL=instrumentation.d.ts.map