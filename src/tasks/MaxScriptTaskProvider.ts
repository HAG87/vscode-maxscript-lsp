import {
    commands,
    CustomExecution,
    EventEmitter,
    Pseudoterminal,
    RelativePattern,
    Task,
    TaskDefinition,
    TaskProvider,
    Uri,
    WorkspaceFolder,
    workspace,
} from 'vscode';

interface MaxScriptTaskDefinition extends TaskDefinition {
    type: 'maxscript';
    task: 'minify' | 'prettify';
    patterns?: string[];
    continueOnError?: boolean;
}

class MaxScriptFilesTaskTerminal implements Pseudoterminal {
    private readonly writeEmitter = new EventEmitter<string>();
    private readonly closeEmitter = new EventEmitter<number>();

    public readonly onDidWrite = this.writeEmitter.event;
    public readonly onDidClose = this.closeEmitter.event;

    public constructor(
        private readonly workspaceFolder: WorkspaceFolder,
        private readonly definition: MaxScriptTaskDefinition,
    ) { }

    public open(): void {
        void this.run();
    }

    public close(): void {
        // No-op: there is no long-running process to terminate.
    }

    private async run(): Promise<void> {
        try {
            const taskKind = this.definition.task;
            const operation = taskKind === 'prettify' ? 'prettify' : 'minify';
            const progressVerb = taskKind === 'prettify' ? 'Prettifying' : 'Minifying';
            const commandId = taskKind === 'prettify' ? 'mxs.prettify.files' : 'mxs.minify.files';

            this.writeLine(`MaxScript task: ${operation}`);

            const patterns = this.definition.patterns && this.definition.patterns.length > 0
                ? this.definition.patterns
                : ['**/*.{ms,mcr}'];

            const uniqueFiles = new Map<string, Uri>();
            for (const pattern of patterns) {
                const files = await workspace.findFiles(
                    new RelativePattern(this.workspaceFolder, pattern),
                    '**/{node_modules,.git,out,dist}/**',
                );
                for (const file of files) {
                    uniqueFiles.set(file.toString(), file);
                }
            }

            const fileUris = Array.from(uniqueFiles.values());
            if (fileUris.length === 0) {
                this.writeLine('No .ms/.mcr files found.');
                this.closeEmitter.fire(0);
                return;
            }

            this.writeLine(`Found ${fileUris.length} file(s).`);
            const continueOnError = this.definition.continueOnError ?? false;
            let failures = 0;

            for (const fileUri of fileUris) {
                const relativePath = workspace.asRelativePath(fileUri, false);
                try {
                    this.writeLine(`${progressVerb} ${relativePath} ...`);
                    await commands.executeCommand(commandId, fileUri);
                } catch (error) {
                    failures++;
                    const message = error instanceof Error ? error.message : String(error);
                    this.writeLine(`Failed: ${relativePath} (${message})`);
                    if (!continueOnError) {
                        this.closeEmitter.fire(1);
                        return;
                    }
                }
            }

            if (failures > 0) {
                this.writeLine(`Done with ${failures} failure(s).`);
                this.closeEmitter.fire(1);
                return;
            }

            this.writeLine('Done.');
            this.closeEmitter.fire(0);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.writeLine(`Task failed: ${message}`);
            this.closeEmitter.fire(1);
        }
    }

    private writeLine(line: string): void {
        this.writeEmitter.fire(`${line}\r\n`);
    }
}

export class MaxScriptTaskProvider implements TaskProvider {
    public static readonly taskType = 'maxscript';

    public provideTasks(): Task[] {
        const folder = workspace.workspaceFolders?.[0];
        if (!folder) {
            return [];
        }

        const minifyTask: MaxScriptTaskDefinition = {
            type: MaxScriptTaskProvider.taskType,
            task: 'minify',
            patterns: ['**/*.{ms,mcr}'],
            continueOnError: true,
        };

        const prettifyTask: MaxScriptTaskDefinition = {
            type: MaxScriptTaskProvider.taskType,
            task: 'prettify',
            patterns: ['**/*.{ms,mcr}'],
            continueOnError: true,
        };

        return [
            this.createTask(folder, minifyTask),
            this.createTask(folder, prettifyTask),
        ];
    }

    public resolveTask(task: Task): Task | undefined {
        const definition = task.definition as MaxScriptTaskDefinition;
        if (
            definition.type !== MaxScriptTaskProvider.taskType
            || (definition.task !== 'minify' && definition.task !== 'prettify')
        ) {
            return undefined;
        }

        const folder = workspace.workspaceFolders?.[0];
        if (!folder) {
            return undefined;
        }

        return this.createTask(folder, definition);
    }

    private createTask(folder: WorkspaceFolder, definition: MaxScriptTaskDefinition): Task {
        const label = definition.task === 'prettify'
            ? 'Prettify MaxScript Files'
            : 'Minify MaxScript Files';

        return new Task(
            definition,
            folder,
            label,
            'maxscript',
            new CustomExecution(async () => new MaxScriptFilesTaskTerminal(folder, definition)),
            [],
        );
    }
}
