import type { PluginState, TemplateAssistantGenerateResult } from '../types';
export declare class ChatPanel {
    private state;
    private container;
    private onApply;
    private onGenerate;
    constructor(container: HTMLElement, onGenerate: (request: string) => Promise<TemplateAssistantGenerateResult>, onApply: (result: TemplateAssistantGenerateResult) => void);
    private loadState;
    private createDefaultState;
    private saveState;
    private init;
    private bindEvents;
    private render;
    private getHTML;
    private renderTurn;
    private renderDiff;
    private updatePanelVisibility;
    private scrollToBottom;
    private toggle;
    private close;
    private handleSend;
    private handleApply;
    private handleRiskConfirm;
    private clearHistory;
    private handleRetry;
    setCurrentSheetKey(sheetKey: string | null): void;
    getState(): PluginState;
}
