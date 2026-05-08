import type { ChatTurn, PluginState, TemplateAssistantGenerateResult, TemplateAssistantHighRiskItem } from '../types';
import { generateId, formatTimestamp, escapeHtml } from '../utils';

const STATE_KEY = 'ai-table-tool-state';

export class ChatPanel {
    private state: PluginState;
    private container: HTMLElement;
    private onApply: (result: TemplateAssistantGenerateResult) => void;
    private onGenerate: (request: string) => Promise<TemplateAssistantGenerateResult>;
    
    constructor(
        container: HTMLElement,
        onGenerate: (request: string) => Promise<TemplateAssistantGenerateResult>,
        onApply: (result: TemplateAssistantGenerateResult) => void
    ) {
        this.container = container;
        this.onGenerate = onGenerate;
        this.onApply = onApply;
        this.state = this.loadState();
        this.init();
    }
    
    private loadState(): PluginState {
        try {
            const saved = localStorage.getItem(STATE_KEY);
            return saved ? JSON.parse(saved) : this.createDefaultState();
        } catch {
            return this.createDefaultState();
        }
    }
    
    private createDefaultState(): PluginState {
        return {
            isOpen: false,
            isGenerating: false,
            transcript: [],
            userRequest: '',
            maxRounds: 3,
            tableApiPreset: '',
            currentSheetKey: null,
        };
    }
    
    private saveState(): void {
        localStorage.setItem(STATE_KEY, JSON.stringify(this.state));
    }
    
    private init(): void {
        this.render();
        this.bindEvents();
    }
    
    private bindEvents(): void {
        const container = this.container;
        
        container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.closest('.ai-table-tool-close')) {
                this.close();
            }
            
            if (target.closest('.ai-table-tool-toggle')) {
                this.toggle();
            }
            
            if (target.closest('.ai-table-tool-send')) {
                this.handleSend();
            }
            
            if (target.closest('.ai-table-tool-apply')) {
                this.handleApply(target);
            }
            
            if (target.closest('.ai-table-tool-risk-checkbox')) {
                this.handleRiskConfirm(target);
            }
            
            if (target.closest('.ai-table-tool-clear')) {
                this.clearHistory();
            }
            
            if (target.closest('.ai-table-tool-retry')) {
                this.handleRetry(target);
            }
        });
        
        const input = container.querySelector('.ai-table-tool-input') as HTMLTextAreaElement;
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });
        }
    }
    
    private render(): void {
        this.container.innerHTML = this.getHTML();
        this.updatePanelVisibility();
        this.scrollToBottom();
    }
    
    private getHTML(): string {
        const { isOpen, isGenerating, transcript, userRequest } = this.state;
        
        return `
            <div class="ai-table-tool-wrapper">
                <button class="ai-table-tool-toggle ${isOpen ? 'active' : ''}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>AI表格工具</span>
                </button>
                
                <div class="ai-table-tool-panel ${isOpen ? 'open' : ''}">
                    <div class="ai-table-tool-header">
                        <h3>AI数据库表格处理工具</h3>
                        <button class="ai-table-tool-close">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="ai-table-tool-messages" id="ai-table-tool-messages">
                        ${transcript.map(this.renderTurn).join('')}
                        ${isGenerating ? '<div class="ai-table-tool-loading"><div class="ai-table-tool-spinner"></div><span>正在生成...</span></div>' : ''}
                    </div>
                    
                    <div class="ai-table-tool-input-area">
                        <textarea 
                            class="ai-table-tool-input" 
                            placeholder="描述您的表格操作需求...&#10;&#10;例如：&#10;• 新增一张角色表，包含姓名、等级、职业列&#10;• 删除当前表的年龄列&#10;• 在用户表中新增邮箱字段"
                            value="${escapeHtml(userRequest)}"
                            disabled="${isGenerating ? 'disabled' : ''}"
                        ></textarea>
                        <div class="ai-table-tool-actions">
                            <button class="ai-table-tool-clear" ${isGenerating ? 'disabled' : ''}>清空</button>
                            <button class="ai-table-tool-send" ${isGenerating || !userRequest.trim() ? 'disabled' : ''}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                发送
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    private renderTurn(turn: ChatTurn): string {
        const timestamp = formatTimestamp(turn.timestamp);
        
        if (turn.type === 'user') {
            return `
                <div class="ai-table-tool-message ai-table-tool-user">
                    <div class="ai-table-tool-avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <div class="ai-table-tool-message-content">
                        <div class="ai-table-tool-message-header">
                            <span class="ai-table-tool-message-name">您</span>
                            <span class="ai-table-tool-message-time">${timestamp}</span>
                        </div>
                        <p>${escapeHtml(turn.content)}</p>
                    </div>
                </div>
            `;
        }
        
        if (turn.type === 'error') {
            return `
                <div class="ai-table-tool-message ai-table-tool-error">
                    <div class="ai-table-tool-avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12" y2="16"></line>
                        </svg>
                    </div>
                    <div class="ai-table-tool-message-content">
                        <div class="ai-table-tool-message-header">
                            <span class="ai-table-tool-message-name">错误</span>
                            <span class="ai-table-tool-message-time">${timestamp}</span>
                        </div>
                        <p class="ai-table-tool-error-text">${escapeHtml(turn.errorMessage || turn.content)}</p>
                    </div>
                </div>
            `;
        }
        
        const compileResult = turn.compileResult;
        const highRiskItems = compileResult?.highRiskItems || [];
        const hasHighRisk = highRiskItems.length > 0;
        const confirmedKey = `risk-confirmed-${turn.id}`;
        const isConfirmed = localStorage.getItem(confirmedKey) === 'true';
        
        const diff = compileResult?.diff;
        const diffHtml = diff ? this.renderDiff(diff) : '';
        
        return `
            <div class="ai-table-tool-message ai-table-tool-assistant" data-turn-id="${turn.id}">
                <div class="ai-table-tool-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                </div>
                <div class="ai-table-tool-message-content">
                    <div class="ai-table-tool-message-header">
                        <span class="ai-table-tool-message-name">AI助手</span>
                        <span class="ai-table-tool-message-time">${timestamp}</span>
                    </div>
                    <p>${escapeHtml(turn.summary || turn.content)}</p>
                    
                    ${diffHtml}
                    
                    ${hasHighRisk ? `
                        <div class="ai-table-tool-risk-warning">
                            <strong>⚠️ 高风险操作确认</strong>
                            <p>以下操作需要您确认：</p>
                            <ul>
                                ${highRiskItems.map((item: TemplateAssistantHighRiskItem) => `
                                    <li>
                                        <label>
                                            <input type="checkbox" class="ai-table-tool-risk-checkbox" data-turn-id="${turn.id}" data-risk-type="${item.type}" ${isConfirmed ? 'checked' : ''}>
                                            ${escapeHtml(item.label)}
                                        </label>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="ai-table-tool-result-actions">
                        <button 
                            class="ai-table-tool-apply" 
                            data-turn-id="${turn.id}"
                            ${hasHighRisk && !isConfirmed ? 'disabled' : ''}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            应用到表格
                        </button>
                        <button class="ai-table-tool-retry" data-turn-id="${turn.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                <path d="M21 3v5h-5"></path>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                <path d="M8 16H3v5"></path>
                            </svg>
                            重新生成
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    private renderDiff(diff: any): string {
        const parts: string[] = [];
        
        if (diff.addedSheets?.length) {
            parts.push(`<div><strong>新增表:</strong> ${diff.addedSheets.map((s: any) => s.name).join(', ')}</div>`);
        }
        
        if (diff.deletedSheets?.length) {
            parts.push(`<div><strong>删除表:</strong> ${diff.deletedSheets.map((s: any) => s.name).join(', ')}</div>`);
        }
        
        if (diff.renamedSheets?.length) {
            parts.push(`<div><strong>重命名表:</strong> ${diff.renamedSheets.map((s: any) => `${s.beforeName} → ${s.afterName}`).join(', ')}</div>`);
        }
        
        if (diff.patchedSchemaSheets?.length) {
            parts.push(`<div><strong>修改结构:</strong> ${diff.patchedSchemaSheets.map((s: any) => s.name).join(', ')}</div>`);
        }
        
        if (diff.patchedContentSheets?.length) {
            parts.push(`<div><strong>修改内容:</strong> ${diff.patchedContentSheets.map((s: any) => s.name).join(', ')}</div>`);
        }
        
        if (parts.length === 0) {
            return '';
        }
        
        return `
            <div class="ai-table-tool-diff">
                <strong>变更预览:</strong>
                ${parts.join('')}
            </div>
        `;
    }
    
    private updatePanelVisibility(): void {
        const panel = this.container.querySelector('.ai-table-tool-panel') as HTMLElement;
        const toggle = this.container.querySelector('.ai-table-tool-toggle') as HTMLElement;
        
        if (this.state.isOpen) {
            panel?.classList.add('open');
            toggle?.classList.add('active');
        } else {
            panel?.classList.remove('open');
            toggle?.classList.remove('active');
        }
    }
    
    private scrollToBottom(): void {
        const messages = this.container.querySelector('.ai-table-tool-messages') as HTMLElement;
        if (messages) {
            messages.scrollTop = messages.scrollHeight;
        }
    }
    
    private toggle(): void {
        this.state.isOpen = !this.state.isOpen;
        this.saveState();
        this.render();
    }
    
    private close(): void {
        this.state.isOpen = false;
        this.saveState();
        this.render();
    }
    
    private async handleSend(): Promise<void> {
        const input = this.container.querySelector('.ai-table-tool-input') as HTMLTextAreaElement;
        const request = input?.value?.trim() || '';
        
        if (!request || this.state.isGenerating) {
            return;
        }
        
        this.state.isGenerating = true;
        this.state.userRequest = request;
        
        const userTurn: ChatTurn = {
            id: generateId(),
            type: 'user',
            content: request,
            timestamp: Date.now(),
        };
        
        this.state.transcript.push(userTurn);
        this.saveState();
        this.render();
        
        try {
            const result = await this.onGenerate(request);
            
            const assistantTurn: ChatTurn = {
                id: generateId(),
                type: 'assistant',
                content: result.draft.summary,
                timestamp: Date.now(),
                draft: result.draft,
                compileResult: result.compileResult,
                aiRawText: result.aiRawText,
            };
            
            this.state.transcript.push(assistantTurn);
            localStorage.removeItem(`risk-confirmed-${assistantTurn.id}`);
            
        } catch (error: any) {
            const errorTurn: ChatTurn = {
                id: generateId(),
                type: 'error',
                content: '',
                timestamp: Date.now(),
                errorMessage: error?.message || '发生未知错误',
            };
            
            this.state.transcript.push(errorTurn);
        } finally {
            this.state.isGenerating = false;
            this.state.userRequest = '';
            this.saveState();
            this.render();
        }
    }
    
    private handleApply(target: HTMLElement): void {
        const turnId = target.getAttribute('data-turn-id');
        const turn = this.state.transcript.find((t) => t.id === turnId && t.type === 'assistant');
        
        if (turn && turn.compileResult) {
            this.onApply({
                draft: turn.draft!,
                aiRawText: turn.aiRawText || '',
                messages: [],
                compileResult: turn.compileResult,
            });
        }
    }
    
    private handleRiskConfirm(target: HTMLElement): void {
        const turnId = target.getAttribute('data-turn-id');
        const riskType = target.getAttribute('data-risk-type');
        
        const turn = this.state.transcript.find((t) => t.id === turnId);
        const highRiskItems = turn?.compileResult?.highRiskItems || [];
        
        const checkboxes = this.container.querySelectorAll(`.ai-table-tool-risk-checkbox[data-turn-id="${turnId}"]`);
        const allChecked = Array.from(checkboxes).every((cb) => (cb as HTMLInputElement).checked);
        
        if (allChecked) {
            localStorage.setItem(`risk-confirmed-${turnId}`, 'true');
        } else {
            localStorage.removeItem(`risk-confirmed-${turnId}`);
        }
        
        this.render();
    }
    
    private clearHistory(): void {
        this.state.transcript = [];
        this.state.userRequest = '';
        this.saveState();
        this.render();
    }
    
    private handleRetry(target: HTMLElement): void {
        const turnId = target.getAttribute('data-turn-id');
        const turnIndex = this.state.transcript.findIndex((t) => t.id === turnId);
        
        if (turnIndex > 0) {
            const prevTurn = this.state.transcript[turnIndex - 1];
            if (prevTurn.type === 'user') {
                this.state.transcript = this.state.transcript.slice(0, turnIndex);
                this.state.userRequest = prevTurn.content;
                this.saveState();
                this.render();
            }
        }
    }
    
    public setCurrentSheetKey(sheetKey: string | null): void {
        this.state.currentSheetKey = sheetKey;
        this.saveState();
    }
    
    public getState(): PluginState {
        return this.state;
    }
}
