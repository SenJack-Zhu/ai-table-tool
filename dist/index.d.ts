import type { TemplateAssistantGenerateResult } from './types';
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
declare class AITableToolPlugin {
    private chatPanel;
    private isInitialized;
    private tavernContext;
    private settings;
    /**
     * 等待 Tavern API 就绪
     */
    private waitForTavernAPI;
    /**
     * 获取酒馆上下文
     */
    private getTavernContext;
    /**
     * 初始化扩展设置
     */
    private initSettings;
    /**
     * 获取默认设置
     */
    private getDefaultSettings;
    /**
     * 保存设置
     */
    private saveSettings;
    /**
     * 设置容器
     */
    private setupContainer;
    /**
     * 设置样式
     */
    private setupStyles;
    /**
     * 设置聊天面板
     */
    private setupChatPanel;
    /**
     * 设置事件监听
     */
    private setupEventListeners;
    /**
     * 设置更新回调
     */
    private onSettingsUpdate;
    /**
     * 聊天变更回调
     */
    private onChatChanged;
    /**
     * 生成草稿
     */
    private handleGenerate;
    /**
     * 应用草稿
     */
    private handleApply;
    /**
     * 获取当前临时数据
     */
    private getCurrentTempData;
    /**
     * 获取当前表格键
     */
    private getCurrentSheetKey;
    /**
     * 获取表格顺序
     */
    private getCurrentSheetOrder;
    /**
     * 应用草稿到编辑器
     */
    private applyDraftToEditor;
    /**
     * 触发编辑器刷新
     */
    private triggerEditorRefresh;
    /**
     * 显示提示消息
     */
    private showToast;
    /**
     * 核心初始化方法
     */
    init(): Promise<void>;
    /**
     * 生成草稿（公共方法）
     */
    generateDraft(request: string): Promise<TemplateAssistantGenerateResult>;
    /**
     * 应用草稿（公共方法）
     */
    applyDraft(result: TemplateAssistantGenerateResult): boolean;
    /**
     * 获取设置
     */
    getSettings(): Record<string, any>;
    /**
     * 更新设置
     */
    updateSettings(newSettings: Record<string, any>): void;
}
declare const plugin: AITableToolPlugin;
export { plugin as AITableToolPlugin };
