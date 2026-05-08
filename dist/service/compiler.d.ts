import type { TemplateAssistantDraft, TemplateAssistantCompileResult } from '../types';
interface CompileInput {
    tempData: Record<string, any>;
    sheetOrder: string[] | null;
    currentSheetKey: string | null;
    draft: TemplateAssistantDraft;
}
export declare function compileTemplateAssistantDraft(input: CompileInput): TemplateAssistantCompileResult;
export {};
