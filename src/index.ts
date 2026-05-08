import { ChatPanel } from './ui/chat-panel';
import { generateTemplateAssistantDraft, buildTemplateAssistantFingerprint } from './service/ai-service';
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

const PLUGIN_ID = 'ai-table-tool';

class AITableToolPlugin {
    private chatPanel: ChatPanel | null = null;
    private isInitialized = false;

    init(): void {
        if (this.isInitialized) {
            console.log('AI表格工具已初始化');
            return;
        }

        this.setupContainer();
        this.setupStyles();
        this.setupChatPanel();

        this.isInitialized = true;
        console.log('AI表格工具初始化完成');
    }

    private setupContainer(): void {
        const container = document.createElement('div');
        container.id = PLUGIN_ID;
        document.body.appendChild(container);
    }

    private setupStyles(): void {
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = this.getPluginUrl('dist/style.css');
        document.head.appendChild(styleLink);
    }

    private getPluginUrl(path: string): string {
        const script = document.querySelector(`script[src*="${PLUGIN_ID}"]`);
        if (script) {
            const scriptUrl = script.getAttribute('src') || '';
            return scriptUrl.replace(/dist\/main\.js$/, path);
        }
        return `plugins/${PLUGIN_ID}/${path}`;
    }

    private setupChatPanel(): void {
        const container = document.getElementById(PLUGIN_ID);
        if (!container) return;

        this.chatPanel = new ChatPanel(
            container,
            this.handleGenerate.bind(this),
            this.handleApply.bind(this)
        );
    }

    private async handleGenerate(request: string): Promise<TemplateAssistantGenerateResult> {
        const tempData = this.getCurrentTempData();
        const currentSheetKey = this.getCurrentSheetKey();
        const sheetOrder = this.getCurrentSheetOrder();

        return generateTemplateAssistantDraft({
            tempData,
            currentSheetKey,
            sheetOrder,
            userRequest: request,
        });
    }

    private handleApply(result: TemplateAssistantGenerateResult): void {
        const success = this.applyDraftToEditor(result);
        if (success) {
            this.showToast('success', '表格已成功更新');
        } else {
            this.showToast('error', '应用失败，数据结构可能已变化');
        }
    }

    private getCurrentTempData(): Record<string, any> {
        const tavernState = (window as any).tavern?.state || {};
        return tavernState.tempData || {};
    }

    private getCurrentSheetKey(): string | null {
        const tavernState = (window as any).tavern?.state || {};
        return tavernState.currentSheetKey || null;
    }

    private getCurrentSheetOrder(): string[] {
        const tavernState = (window as any).tavern?.state || {};
        return tavernState.sheetOrder || [];
    }

    private applyDraftToEditor(result: TemplateAssistantGenerateResult): boolean {
        const { draft, compileResult } = result;
        const tavernState = (window as any).tavern?.state;
        
        if (!tavernState) {
            console.warn('无法找到Tavern状态');
            return false;
        }

        const baselineFingerprint = draft.baseFingerprint;
        const currentFingerprint = buildTemplateAssistantFingerprint(tavernState.tempData || {});

        if (baselineFingerprint !== currentFingerprint) {
            console.warn('数据结构已变化，草稿已失效');
            return false;
        }

        tavernState.tempData = { ...compileResult.candidateData };
        tavernState.sheetOrder = [...compileResult.orderedSheetKeys];

        if (compileResult.deletedSheetKeys && compileResult.deletedSheetKeys.length > 0) {
            const deletedKeys = new Set(tavernState.deletedSheetKeys || []);
            compileResult.deletedSheetKeys.forEach((key) => deletedKeys.add(key));
            tavernState.deletedSheetKeys = Array.from(deletedKeys);
        }

        if (compileResult.focusSheetKey) {
            tavernState.currentSheetKey = compileResult.focusSheetKey;
        }

        this.triggerEditorRefresh();
        return true;
    }

    private triggerEditorRefresh(): void {
        const event = new CustomEvent('ai-table-tool:refresh', {
            detail: { source: PLUGIN_ID },
        });
        document.dispatchEvent(event);

        if ((window as any).tavern?.refresh) {
            (window as any).tavern.refresh();
        }
    }

    private showToast(type: 'success' | 'error' | 'warning', message: string): void {
        const toastContainer = document.createElement('div');
        toastContainer.className = `ai-table-tool-toast ai-table-tool-toast-${type}`;
        toastContainer.textContent = message;
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 99999;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: #4caf50;' : ''}
            ${type === 'error' ? 'background: #f44336;' : ''}
            ${type === 'warning' ? 'background: #ff9800;' : ''}
        `;

        document.body.appendChild(toastContainer);

        setTimeout(() => {
            toastContainer.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                toastContainer.remove();
            }, 300);
        }, 3000);
    }

    generateDraft(request: string): Promise<TemplateAssistantGenerateResult> {
        return this.handleGenerate(request);
    }

    applyDraft(result: TemplateAssistantGenerateResult): boolean {
        return this.applyDraftToEditor(result);
    }
}

const plugin = new AITableToolPlugin();

window.AITableTool = {
    init: () => plugin.init(),
    generateDraft: (request: string) => plugin.generateDraft(request),
    applyDraft: (result: TemplateAssistantGenerateResult) => plugin.applyDraft(result),
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        plugin.init();
    }, 1000);
});

export { plugin as AITableToolPlugin };
