import { ChatPanel } from './ui/chat-panel';
import { generateTemplateAssistantDraft, buildTemplateAssistantFingerprint } from './service/ai-service';
import type { TemplateAssistantGenerateResult } from './types';

const PLUGIN_ID = 'ai-table-tool';
const PLUGIN_NAME = 'AI数据库表格处理工具';

interface SillyTavernContext {
    extensionSettings: any;
    eventSource: EventSource;
    eventTypes: {
        SETTINGS_UPDATE: string;
        CHAT_CHANGED: string;
        EXTENSION_REGISTERED: string;
    };
    saveSettingsDebounced: () => void;
    getExtensionSettings: (extensionId: string) => any;
    setExtensionSettings: (extensionId: string, settings: any) => void;
    showToast?: (message: string, type?: string) => void;
}

interface SillyTavernAPI {
    libs: {
        jQuery: typeof $;
    };
    getContext: () => SillyTavernContext;
}

declare global {
    interface Window {
        SillyTavern: SillyTavernAPI;
        AITableTool: {
            init: () => void;
            generateDraft: (request: string) => Promise<TemplateAssistantGenerateResult>;
            applyDraft: (result: TemplateAssistantGenerateResult) => boolean;
        };
    }
}

class AITableToolPlugin {
    private chatPanel: ChatPanel | null = null;
    private isInitialized = false;
    private tavernContext: SillyTavernContext | null = null;
    private settings: Record<string, any> = {};

    /**
     * 等待 Tavern API 就绪
     */
    private async waitForTavernAPI(maxWaitMs = 15000): Promise<boolean> {
        const start = Date.now();
        
        const probe = () => {
            const hasST = !!(window as any).SillyTavern;
            const hasGetContext = typeof (window as any).SillyTavern?.getContext === 'function';
            let hasExtSettings = false;
            let hasEventSource = false;
            let hasSaveFn = false;
            
            if (hasGetContext) {
                try {
                    const ctx = (window as any).SillyTavern.getContext();
                    hasExtSettings = !!ctx?.extensionSettings;
                    hasEventSource = !!(ctx?.eventSource && ctx?.eventTypes);
                    hasSaveFn = typeof ctx?.saveSettingsDebounced === 'function';
                } catch (e) {
                    // getContext 抛异常说明酒馆还没完全初始化
                }
            }
            return { hasST, hasGetContext, hasExtSettings, hasEventSource, hasSaveFn };
        };

        while (Date.now() - start < maxWaitMs) {
            const p = probe();
            
            if (p.hasST && p.hasGetContext && p.hasExtSettings && p.hasEventSource && p.hasSaveFn) {
                console.log(`[${PLUGIN_NAME}] 酒馆 API 全部就绪，等待了 ${Date.now() - start}ms`);
                return true;
            }
            
            await new Promise(r => setTimeout(r, 100));
        }

        const p = probe();
        if (p.hasST && p.hasGetContext) {
            console.warn(`[${PLUGIN_NAME}] 部分 API 未就绪，但 getContext 可用，降级启动`);
            return true;
        }

        console.error(`[${PLUGIN_NAME}] 等待 Tavern API 超时（${maxWaitMs}ms）`);
        return false;
    }

    /**
     * 获取酒馆上下文
     */
    private getTavernContext(): SillyTavernContext | null {
        if (this.tavernContext) {
            return this.tavernContext;
        }
        
        try {
            this.tavernContext = (window as any).SillyTavern?.getContext?.();
            return this.tavernContext;
        } catch (e) {
            console.error(`[${PLUGIN_NAME}] 获取 Tavern 上下文失败`, e);
            return null;
        }
    }

    /**
     * 初始化扩展设置
     */
    private initSettings(): void {
        const ctx = this.getTavernContext();
        if (!ctx) return;

        try {
            this.settings = ctx.getExtensionSettings(PLUGIN_ID) || this.getDefaultSettings();
        } catch (e) {
            this.settings = this.getDefaultSettings();
        }
    }

    /**
     * 获取默认设置
     */
    private getDefaultSettings(): Record<string, any> {
        return {
            enabled: true,
            showToggleButton: true,
            position: 'right',
            maxHistory: 50,
            autoApply: false,
        };
    }

    /**
     * 保存设置
     */
    private saveSettings(): void {
        const ctx = this.getTavernContext();
        if (!ctx) return;

        try {
            ctx.setExtensionSettings(PLUGIN_ID, this.settings);
            ctx.saveSettingsDebounced();
        } catch (e) {
            console.error(`[${PLUGIN_NAME}] 保存设置失败`, e);
        }
    }

    /**
     * 设置容器
     */
    private setupContainer(): void {
        const existing = document.getElementById(PLUGIN_ID);
        if (existing) {
            existing.remove();
        }

        const container = document.createElement('div');
        container.id = PLUGIN_ID;
        container.className = 'ai-table-tool-container';
        document.body.appendChild(container);
    }

    /**
     * 设置样式
     */
    private setupStyles(): void {
        const existingLink = document.querySelector(`link[data-plugin="${PLUGIN_ID}"]`);
        if (existingLink) {
            existingLink.remove();
        }

        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.setAttribute('data-plugin', PLUGIN_ID);
        
        const script = document.querySelector(`script[src*="${PLUGIN_ID}"]`);
        if (script) {
            const scriptUrl = script.getAttribute('src') || '';
            styleLink.href = scriptUrl.replace(/dist\/main\.js$/, 'dist/style.css');
        } else {
            styleLink.href = `plugins/${PLUGIN_ID}/dist/style.css`;
        }
        
        document.head.appendChild(styleLink);
    }

    /**
     * 设置聊天面板
     */
    private setupChatPanel(): void {
        const container = document.getElementById(PLUGIN_ID);
        if (!container) return;

        this.chatPanel = new ChatPanel(
            container,
            this.handleGenerate.bind(this),
            this.handleApply.bind(this)
        );
    }

    /**
     * 设置事件监听
     */
    private setupEventListeners(): void {
        const ctx = this.getTavernContext();
        if (!ctx) return;

        try {
            ctx.eventSource.addEventListener(ctx.eventTypes.SETTINGS_UPDATE, () => {
                this.onSettingsUpdate();
            });

            ctx.eventSource.addEventListener(ctx.eventTypes.CHAT_CHANGED, () => {
                this.onChatChanged();
            });
        } catch (e) {
            console.warn(`[${PLUGIN_NAME}] 设置事件监听失败`, e);
        }
    }

    /**
     * 设置更新回调
     */
    private onSettingsUpdate(): void {
        const ctx = this.getTavernContext();
        if (!ctx) return;

        try {
            const newSettings = ctx.getExtensionSettings(PLUGIN_ID);
            if (newSettings) {
                this.settings = { ...this.settings, ...newSettings };
            }
        } catch (e) {
            console.error(`[${PLUGIN_NAME}] 处理设置更新失败`, e);
        }
    }

    /**
     * 聊天变更回调
     */
    private onChatChanged(): void {
        console.debug(`[${PLUGIN_NAME}] 聊天已变更`);
        // 可以在这里处理聊天切换的逻辑
    }

    /**
     * 生成草稿
     */
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

    /**
     * 应用草稿
     */
    private handleApply(result: TemplateAssistantGenerateResult): void {
        const success = this.applyDraftToEditor(result);
        if (success) {
            this.showToast('success', '表格已成功更新');
        } else {
            this.showToast('error', '应用失败，数据结构可能已变化');
        }
    }

    /**
     * 获取当前临时数据
     */
    private getCurrentTempData(): Record<string, any> {
        const ctx = this.getTavernContext();
        if (!ctx) return {};

        try {
            const tavernState = (window as any).tavern?.state || {};
            return tavernState.tempData || {};
        } catch (e) {
            return {};
        }
    }

    /**
     * 获取当前表格键
     */
    private getCurrentSheetKey(): string | null {
        const ctx = this.getTavernContext();
        if (!ctx) return null;

        try {
            const tavernState = (window as any).tavern?.state || {};
            return tavernState.currentSheetKey || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 获取表格顺序
     */
    private getCurrentSheetOrder(): string[] {
        const ctx = this.getTavernContext();
        if (!ctx) return [];

        try {
            const tavernState = (window as any).tavern?.state || {};
            return tavernState.sheetOrder || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * 应用草稿到编辑器
     */
    private applyDraftToEditor(result: TemplateAssistantGenerateResult): boolean {
        const { draft, compileResult } = result;
        const tavernState = (window as any).tavern?.state;
        
        if (!tavernState) {
            console.warn(`[${PLUGIN_NAME}] 无法找到 Tavern 状态`);
            return false;
        }

        const baselineFingerprint = draft.baseFingerprint;
        const currentFingerprint = buildTemplateAssistantFingerprint(tavernState.tempData || {});

        if (baselineFingerprint !== currentFingerprint) {
            console.warn(`[${PLUGIN_NAME}] 数据结构已变化，草稿已失效`);
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

    /**
     * 触发编辑器刷新
     */
    private triggerEditorRefresh(): void {
        const event = new CustomEvent(`${PLUGIN_ID}:refresh`, {
            detail: { source: PLUGIN_ID },
        });
        document.dispatchEvent(event);

        if ((window as any).tavern?.refresh) {
            (window as any).tavern.refresh();
        }
    }

    /**
     * 显示提示消息
     */
    private showToast(type: 'success' | 'error' | 'warning', message: string): void {
        const ctx = this.getTavernContext();
        if (ctx && typeof ctx.showToast === 'function') {
            ctx.showToast(message, type);
            return;
        }

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

    /**
     * 核心初始化方法
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            console.log(`[${PLUGIN_NAME}] 已初始化`);
            return;
        }

        console.log(`[${PLUGIN_NAME}] 开始初始化...`);

        const ready = await this.waitForTavernAPI();
        if (!ready) {
            console.error(`[${PLUGIN_NAME}] Tavern API 未就绪，初始化失败`);
            return;
        }

        this.initSettings();
        this.setupContainer();
        this.setupStyles();
        this.setupChatPanel();
        this.setupEventListeners();

        this.isInitialized = true;
        console.log(`[${PLUGIN_NAME}] 初始化完成`);
    }

    /**
     * 生成草稿（公共方法）
     */
    generateDraft(request: string): Promise<TemplateAssistantGenerateResult> {
        return this.handleGenerate(request);
    }

    /**
     * 应用草稿（公共方法）
     */
    applyDraft(result: TemplateAssistantGenerateResult): boolean {
        return this.applyDraftToEditor(result);
    }

    /**
     * 获取设置
     */
    getSettings(): Record<string, any> {
        return { ...this.settings };
    }

    /**
     * 更新设置
     */
    updateSettings(newSettings: Record<string, any>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }
}

const plugin = new AITableToolPlugin();

window.AITableTool = {
    init: () => plugin.init(),
    generateDraft: (request: string) => plugin.generateDraft(request),
    applyDraft: (result: TemplateAssistantGenerateResult) => plugin.applyDraft(result),
};

// 插件加载时 DOM 已就绪，延迟启动确保 Tavern 完全初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        plugin.init();
    }, 500);
});

export { plugin as AITableToolPlugin };