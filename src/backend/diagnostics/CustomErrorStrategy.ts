import { DefaultErrorStrategy, Parser, RecognitionException, Token } from 'antlr4ng';

/**
 * Custom error recovery strategy that extends DefaultErrorStrategy.
 * Key improvements:
 * 1. Deduplicates error reports at the same position
 * 2. Suppresses error reports during sync() operations (cascading errors)
 */
export class CustomErrorStrategy extends DefaultErrorStrategy
{
    private isSyncing = false;
    private reportedErrors = new Set<string>();

    /**
     * Override to deduplicate error reports.
     * The same syntax error can be reported multiple times as the parser
     * tries different recovery strategies.
     */
    public override reportError(recognizer: Parser, e: RecognitionException): void
    {
        // Create unique key for this error location
        const errorKey = `${e.offendingToken?.line}:${e.offendingToken?.column}:${e.offendingToken?.text}`;
        
        // Skip duplicates
        if (this.reportedErrors.has(errorKey)) {
            return;
        }
        
        this.reportedErrors.add(errorKey);
        super.reportError(recognizer, e);
    }

    /**
     * Override sync to track when we're in sync mode.
     * During sync, the parser skips tokens to find a recovery point.
     * We don't want to report errors for tokens being skipped.
     */
    public override sync(recognizer: Parser): void
    {
        this.isSyncing = true;
        try {
            super.sync(recognizer);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Override to suppress error reporting during sync operations.
     * This is where "extraneous input" cascading errors come from.
     */
    public override reportUnwantedToken(recognizer: Parser): void
    {
        if (this.isSyncing) {
            // Suppress - this is a cascading error during sync
            return;
        }
        super.reportUnwantedToken(recognizer);
    }

    /**
     * Override to suppress missing token reports during sync.
     */
    public override reportMissingToken(recognizer: Parser): void
    {
        if (this.isSyncing) {
            // Suppress - this is a cascading error during sync
            return;
        }
        super.reportMissingToken(recognizer);
    }
}
