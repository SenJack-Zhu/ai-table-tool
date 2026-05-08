import type { TemplateAssistantDraft, TemplateAssistantGenerateInput, TemplateAssistantGenerateResult } from '../types';
export declare function buildTemplateAssistantFingerprint(tempData: Record<string, any>): string;
export declare function parseTemplateAssistantDraft(aiText: string): TemplateAssistantDraft;
export declare function generateTemplateAssistantDraft(input: TemplateAssistantGenerateInput): Promise<TemplateAssistantGenerateResult>;
