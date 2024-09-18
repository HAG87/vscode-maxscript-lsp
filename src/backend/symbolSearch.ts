import { BaseSymbol, ScopedSymbol } from 'antlr4-c3';

export class BinaryLifting {
    private up: (BaseSymbol | null)[][] = [];
    private depth: Map<BaseSymbol, number> = new Map();
    private index: Map<BaseSymbol, number> = new Map();
    private nodes: BaseSymbol[] = [];
    private maxDepth: number = 0;

    constructor(root: ScopedSymbol) {
        this.maxDepth = Math.ceil(Math.log2(this.calculateSize(root))) + 1;
        this.indexNodes(root);
        this.init(root);
    }

    private calculateSize(node: BaseSymbol): number {
        if (node instanceof ScopedSymbol) {
            return 1 + node.children.reduce((sum, child) => sum + this.calculateSize(child), 0);
        }
        return 1;
    }

    private indexNodes(node: BaseSymbol) {
        const nodeIndex = this.nodes.length;
        this.nodes.push(node);
        this.index.set(node, nodeIndex);

        if (node instanceof ScopedSymbol) {
            for (const child of node.children) {
                this.indexNodes(child);
            }
        }
    }

    private init(root: ScopedSymbol) {
        this.up = Array(this.nodes.length).fill(null).map(() => Array(this.maxDepth).fill(null));
        this.depth.set(root, 0);
        this.dfs(root);
    }

    private dfs(node: BaseSymbol) {
        const nodeIdx = this.index.get(node)!;

        if (node.parent) {
            const parentIdx = this.index.get(node.parent)!;
            this.up[nodeIdx][0] = node.parent;

            for (let i = 1; i < this.maxDepth; i++) {
                if (this.up[nodeIdx][i - 1]) {
                    const ancestor = this.up[nodeIdx][i - 1]!;
                    const ancestorIdx = this.index.get(ancestor)!;
                    this.up[nodeIdx][i] = this.up[ancestorIdx][i - 1];
                } else {
                    this.up[nodeIdx][i] = null;
                }
            }
        }

        if (node instanceof ScopedSymbol) {
            for (const child of node.children) {
                this.depth.set(child, (this.depth.get(node) || 0) + 1);
                this.dfs(child);
            }
        }
    }

    private lift(node: BaseSymbol, dist: number): BaseSymbol | null {
        let nodeIdx = this.index.get(node)!;

        for (let i = 0; i < this.maxDepth; i++) {
            if (dist & (1 << i)) {
                node = this.up[nodeIdx][i]!;
                if (!node) return null;
                nodeIdx = this.index.get(node)!;
            }
        }
        return node;
    }

    public lca(node1: BaseSymbol, node2: BaseSymbol): BaseSymbol | null {
        let node1Idx = this.index.get(node1)!;
        let node2Idx = this.index.get(node2)!;

        if (this.depth.get(node1)! < this.depth.get(node2)!) {
            [node1, node2] = [node2, node1];
            [node1Idx, node2Idx] = [node2Idx, node1Idx];
        }

        node1 = this.lift(node1, this.depth.get(node1)! - this.depth.get(node2)!)!;

        if (node1 === node2) return node1;

        for (let i = this.maxDepth - 1; i >= 0; i--) {
            if (this.up[node1Idx][i] !== this.up[node2Idx][i]) {
                node1 = this.up[node1Idx][i]!;
                node2 = this.up[node2Idx][i]!;
                node1Idx = this.index.get(node1)!;
                node2Idx = this.index.get(node2)!;
            }
        }

        return this.up[node1Idx][0];
    }
}