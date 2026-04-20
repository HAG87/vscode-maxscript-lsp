import type { IAstContext } from '@backend/IAstContext.js';
import { CompletionSuggestion, CompletionKindHint } from '@backend/types.js';
import { ASTQuery } from '@ast/ASTQuery.js';
import {
    DefinitionBlock,
    FunctionArgument,
    FunctionDefinition,
    FunctionParameter,
    ParameterDefinition,
    RcMenuItem,
    RolloutControl,
    StructDefinition,
    StructMemberField,
    VariableDeclaration,
} from '@ast/ASTNodes.js';
import { Node } from '@strumenta/tylasu';



export class CompletionService {
    public constructor() { }

    public getAstMemberSuggestions(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): CompletionSuggestion[] {
        const memberResult = sourceContext.astMemberCompletionsAtPosition(row1Based, column0Based, sourceText);
        if (!memberResult || memberResult.members.length === 0) {
            return [];
        }

        const suggestions: CompletionSuggestion[] = [];
        for (const member of memberResult.members) {
            if (!member.name) {
                continue;
            }
            const semanticNode = ASTQuery.findSemanticNodeForDeclaration(memberResult.ast, member);
            suggestions.push({
                label: member.name,
                kindHint: this.kindHintForSemanticNode(semanticNode),
                sortText: `0_${member.name}`,
            });
        }

        return suggestions;
    }

    public async getNonMemberSuggestions(
        sourceContext: IAstContext,
        requesterUri: string,
        row1Based: number,
        column0Based: number,
        useAst: boolean,
    ): Promise<CompletionSuggestion[]> {
        const completionList: CompletionSuggestion[] = [];
        const seenNames = new Set<string>();

        if (useAst) {
            const astResult = sourceContext.astCompletionsAtPosition(row1Based, column0Based);
            if (astResult) {
                for (const decl of astResult.declarations) {
                    if (!decl.name) {
                        continue;
                    }
                    seenNames.add(decl.name.toLowerCase());
                    const semanticNode = ASTQuery.findSemanticNodeForDeclaration(astResult.ast, decl);
                    completionList.push({
                        label: decl.name,
                        kindHint: this.kindHintForSemanticNode(semanticNode),
                        sortText: `0_${decl.name}`,
                    });
                }
            }

            const workspaceGlobals = sourceContext.getWorkspaceGlobalCompletions(requesterUri);
            for (const decl of workspaceGlobals) {
                if (!decl.name || seenNames.has(decl.name.toLowerCase())) {
                    continue;
                }
                seenNames.add(decl.name.toLowerCase());
                completionList.push({
                    label: decl.name,
                    kindHint: 'variable',
                    sortText: `1_${decl.name}`,
                });
            }
        }

        const candidates = await sourceContext.getCodeCompletionCandidates(row1Based, column0Based);
        for (const info of candidates) {
            if (seenNames.has(info.name.toLowerCase())) {
                continue;
            }
            seenNames.add(info.name.toLowerCase());
            completionList.push({
                label: info.name,
                symbolKind: info.kind,
                detail: info.description,
            });
        }

        return completionList;
    }

    private kindHintForSemanticNode(node: Node): CompletionKindHint {
        if (node instanceof FunctionDefinition) {
            return 'function';
        }
        if (node instanceof StructDefinition) {
            return 'class';
        }
        if (node instanceof DefinitionBlock) {
            return 'module';
        }
        if (node instanceof FunctionArgument || node instanceof FunctionParameter || node instanceof ParameterDefinition) {
            return 'typeParameter';
        }
        if (node instanceof StructMemberField) {
            return 'field';
        }
        if (node instanceof RolloutControl || node instanceof RcMenuItem) {
            return 'event';
        }
        if (node instanceof VariableDeclaration) {
            return 'variable';
        }
        return 'variable';
    }
}
