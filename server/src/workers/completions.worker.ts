import { expose } from "threads/worker"
import { CodeCompletionItems } from '../mxsCompletions'
//------------------------------------------------------------------------------------------
expose((CTS: any) => CodeCompletionItems(CTS));