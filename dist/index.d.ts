import type { TemplateAssistantGenerateResult } from './types';
declare global {
    interface Window {
        AITableTool: {
            init: () => void;
            generateDraft: (request: string) => Promise<TemplateAssistantGenerateResult>;
            applyDraft: (result: TemplateAssistantGenerateResult) => boolean;
        };
    }
}
declare class AITableToolPlugin {
    private chatPanel;
    private isInitialized;
    init(): void;
    private setupContainer;
    private setupStyles;
    private getPluginUrl;
    private setupChatPanel;
    private handleGenerate;
    private handleApply;
    private getCurrentTempData;
    private getCurrentSheetKey;
    private getCurrentSheetOrder;
    private applyDraftToEditor;
    private triggerEditorRefresh;
    private showToast;
    generateDraft(request: string): Promise<TemplateAssistantGenerateResult>;
    applyDraft(result: TemplateAssistantGenerateResult): boolean;
}
declare const plugin: AITableToolPlugin;
export { plugin as AITableToolPlugin };
