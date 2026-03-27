import {
    CallHierarchyIncomingCall,
    CallHierarchyItem,
    CallHierarchyOutgoingCall,
    CallHierarchyProvider,
    CancellationToken,
    Position,
    ProviderResult,
    SymbolKind,
    TextDocument,
    Uri,
    workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import {
    CallHierarchyCallModel,
    CallHierarchyDescriptor,
    CallHierarchyItemModel,
} from '@backend/callHierarchy/CallHierarchyService.js';
import { Utilities } from './utils.js';

export class mxsCallHierarchyProvider implements CallHierarchyProvider {
    private readonly itemDescriptors = new WeakMap<CallHierarchyItem, CallHierarchyDescriptor>();

    public constructor(private backend: mxsBackend) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    private toVscodeItem(model: CallHierarchyItemModel): CallHierarchyItem {
        const item = new CallHierarchyItem(
            model.kind === 'method' ? SymbolKind.Method : SymbolKind.Function,
            model.name,
            model.detail,
            Uri.parse(model.uri),
            Utilities.lexicalRangeToRange(model.range),
            Utilities.lexicalRangeToRange(model.selectionRange),
        );

        this.itemDescriptors.set(item, {
            uri: model.uri,
            name: model.name,
            selectionRange: model.selectionRange,
        });

        return item;
    }

    private toVscodeIncomingCalls(calls: CallHierarchyCallModel[]): CallHierarchyIncomingCall[] {
        return calls.map((entry) =>
            new CallHierarchyIncomingCall(
                this.toVscodeItem(entry.item),
                entry.fromRanges.map((range) => Utilities.lexicalRangeToRange(range)),
            ));
    }

    private toVscodeOutgoingCalls(calls: CallHierarchyCallModel[]): CallHierarchyOutgoingCall[] {
        return calls.map((entry) =>
            new CallHierarchyOutgoingCall(
                this.toVscodeItem(entry.item),
                entry.fromRanges.map((range) => Utilities.lexicalRangeToRange(range)),
            ));
    }

    private descriptorFromItem(item: CallHierarchyItem): CallHierarchyDescriptor | undefined {
        const descriptor = this.itemDescriptors.get(item);
        if (descriptor) {
            return descriptor;
        }

        return {
            uri: item.uri.toString(),
            name: item.name,
            selectionRange: Utilities.rangeToLexicalRange(item.selectionRange),
        };
    }

    prepareCallHierarchy(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
    ): ProviderResult<CallHierarchyItem | CallHierarchyItem[]> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const config = workspace.getConfiguration('maxScript');
        const traceRouting = config.get<boolean>('providers.traceRouting', false);
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: string): void => {
            if (!tracePerformance) {
                return;
            }
            console.log(`[language-maxscript][Performance] callHierarchy.prepare uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route}`);
        };

        const result = this.backend.prepareAstCallHierarchyItem(
            document.uri.toString(),
            position.line + 1,
            position.character,
        );
        if (!result) {
            if (traceRouting) {
                console.log('[language-maxscript][CallHierarchyProvider] route=None reason=ast-miss phase=prepare');
            }
            logPerformance('None');
            return undefined;
        }

        if (traceRouting) {
            console.log('[language-maxscript][CallHierarchyProvider] route=AST phase=prepare');
        }
        logPerformance('AST');

        return [this.toVscodeItem(result.item)];
    }

    provideCallHierarchyOutgoingCalls(
        item: CallHierarchyItem,
        token: CancellationToken,
    ): ProviderResult<CallHierarchyOutgoingCall[]> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const descriptor = this.descriptorFromItem(item);
        if (!descriptor) {
            return undefined;
        }

        const calls = this.backend.getAstCallHierarchyOutgoingCalls(descriptor);
        return this.toVscodeOutgoingCalls(calls);
    }

    provideCallHierarchyIncomingCalls(
        item: CallHierarchyItem,
        token: CancellationToken,
    ): ProviderResult<CallHierarchyIncomingCall[]> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const descriptor = this.descriptorFromItem(item);
        if (!descriptor) {
            return undefined;
        }

        const calls = this.backend.getAstCallHierarchyIncomingCalls(descriptor);
        return this.toVscodeIncomingCalls(calls);
    }
}
