var AITableTool = (function (exports) {
    'use strict';

    function clone(value) {
        if (value === undefined)
            return value;
        return JSON.parse(JSON.stringify(value));
    }
    function generateId$1() {
        return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    function hashString(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    const STATE_KEY = 'ai-table-tool-state';
    class ChatPanel {
        constructor(container, onGenerate, onApply) {
            this.container = container;
            this.onGenerate = onGenerate;
            this.onApply = onApply;
            this.state = this.loadState();
            this.init();
        }
        loadState() {
            try {
                const saved = localStorage.getItem(STATE_KEY);
                return saved ? JSON.parse(saved) : this.createDefaultState();
            }
            catch {
                return this.createDefaultState();
            }
        }
        createDefaultState() {
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
        saveState() {
            localStorage.setItem(STATE_KEY, JSON.stringify(this.state));
        }
        init() {
            this.render();
            this.bindEvents();
        }
        bindEvents() {
            const container = this.container;
            container.addEventListener('click', (e) => {
                const target = e.target;
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
            const input = container.querySelector('.ai-table-tool-input');
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.handleSend();
                    }
                });
            }
        }
        render() {
            this.container.innerHTML = this.getHTML();
            this.updatePanelVisibility();
            this.scrollToBottom();
        }
        getHTML() {
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
        renderTurn(turn) {
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
                                ${highRiskItems.map((item) => `
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
        renderDiff(diff) {
            const parts = [];
            if (diff.addedSheets?.length) {
                parts.push(`<div><strong>新增表:</strong> ${diff.addedSheets.map((s) => s.name).join(', ')}</div>`);
            }
            if (diff.deletedSheets?.length) {
                parts.push(`<div><strong>删除表:</strong> ${diff.deletedSheets.map((s) => s.name).join(', ')}</div>`);
            }
            if (diff.renamedSheets?.length) {
                parts.push(`<div><strong>重命名表:</strong> ${diff.renamedSheets.map((s) => `${s.beforeName} → ${s.afterName}`).join(', ')}</div>`);
            }
            if (diff.patchedSchemaSheets?.length) {
                parts.push(`<div><strong>修改结构:</strong> ${diff.patchedSchemaSheets.map((s) => s.name).join(', ')}</div>`);
            }
            if (diff.patchedContentSheets?.length) {
                parts.push(`<div><strong>修改内容:</strong> ${diff.patchedContentSheets.map((s) => s.name).join(', ')}</div>`);
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
        updatePanelVisibility() {
            const panel = this.container.querySelector('.ai-table-tool-panel');
            const toggle = this.container.querySelector('.ai-table-tool-toggle');
            if (this.state.isOpen) {
                panel?.classList.add('open');
                toggle?.classList.add('active');
            }
            else {
                panel?.classList.remove('open');
                toggle?.classList.remove('active');
            }
        }
        scrollToBottom() {
            const messages = this.container.querySelector('.ai-table-tool-messages');
            if (messages) {
                messages.scrollTop = messages.scrollHeight;
            }
        }
        toggle() {
            this.state.isOpen = !this.state.isOpen;
            this.saveState();
            this.render();
        }
        close() {
            this.state.isOpen = false;
            this.saveState();
            this.render();
        }
        async handleSend() {
            const input = this.container.querySelector('.ai-table-tool-input');
            const request = input?.value?.trim() || '';
            if (!request || this.state.isGenerating) {
                return;
            }
            this.state.isGenerating = true;
            this.state.userRequest = request;
            const userTurn = {
                id: generateId$1(),
                type: 'user',
                content: request,
                timestamp: Date.now(),
            };
            this.state.transcript.push(userTurn);
            this.saveState();
            this.render();
            try {
                const result = await this.onGenerate(request);
                const assistantTurn = {
                    id: generateId$1(),
                    type: 'assistant',
                    content: result.draft.summary,
                    timestamp: Date.now(),
                    draft: result.draft,
                    compileResult: result.compileResult,
                    aiRawText: result.aiRawText,
                };
                this.state.transcript.push(assistantTurn);
                localStorage.removeItem(`risk-confirmed-${assistantTurn.id}`);
            }
            catch (error) {
                const errorTurn = {
                    id: generateId$1(),
                    type: 'error',
                    content: '',
                    timestamp: Date.now(),
                    errorMessage: error?.message || '发生未知错误',
                };
                this.state.transcript.push(errorTurn);
            }
            finally {
                this.state.isGenerating = false;
                this.state.userRequest = '';
                this.saveState();
                this.render();
            }
        }
        handleApply(target) {
            const turnId = target.getAttribute('data-turn-id');
            const turn = this.state.transcript.find((t) => t.id === turnId && t.type === 'assistant');
            if (turn && turn.compileResult) {
                this.onApply({
                    draft: turn.draft,
                    aiRawText: turn.aiRawText || '',
                    messages: [],
                    compileResult: turn.compileResult,
                });
            }
        }
        handleRiskConfirm(target) {
            const turnId = target.getAttribute('data-turn-id');
            target.getAttribute('data-risk-type');
            const turn = this.state.transcript.find((t) => t.id === turnId);
            turn?.compileResult?.highRiskItems || [];
            const checkboxes = this.container.querySelectorAll(`.ai-table-tool-risk-checkbox[data-turn-id="${turnId}"]`);
            const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
            if (allChecked) {
                localStorage.setItem(`risk-confirmed-${turnId}`, 'true');
            }
            else {
                localStorage.removeItem(`risk-confirmed-${turnId}`);
            }
            this.render();
        }
        clearHistory() {
            this.state.transcript = [];
            this.state.userRequest = '';
            this.saveState();
            this.render();
        }
        handleRetry(target) {
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
        setCurrentSheetKey(sheetKey) {
            this.state.currentSheetKey = sheetKey;
            this.saveState();
        }
        getState() {
            return this.state;
        }
    }

    function createEmptyDiff() {
        return {
            addedSheets: [],
            deletedSheets: [],
            renamedSheets: [],
            movedSheets: [],
            patchedSourceDataSheets: [],
            patchedUpdateConfigSheets: [],
            patchedExportConfigSheets: [],
            patchedContentSheets: [],
            patchedSchemaSheets: [],
            patchedLockSheets: [],
            globalInjectionChanged: false,
        };
    }
    function compileAddSheet(context, operation) {
        const { tempData, sheetOrder, deletedSheetKeys, diff } = context;
        const newSheetKey = `sheet_${Date.now()}`;
        const headers = operation.headers || [];
        const content = [['index', ...headers]];
        const newSheet = {
            name: operation.sheetName || '新表',
            orderNo: sheetOrder.length + 1,
            content,
            sourceData: operation.sourceData || {},
            updateConfig: operation.updateConfig || {},
            exportConfig: operation.exportConfig || {},
        };
        tempData[newSheetKey] = newSheet;
        if (operation.insertAfterSheetKey && sheetOrder.includes(operation.insertAfterSheetKey)) {
            const index = sheetOrder.indexOf(operation.insertAfterSheetKey) + 1;
            sheetOrder.splice(index, 0, newSheetKey);
        }
        else {
            sheetOrder.push(newSheetKey);
        }
        if (deletedSheetKeys.has(newSheetKey)) {
            deletedSheetKeys.delete(newSheetKey);
        }
        diff.addedSheets.push({ sheetKey: newSheetKey, name: newSheet.name });
        context.focusSheetKey = newSheetKey;
    }
    function compileRenameSheet(context, operation) {
        const { tempData, diff } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet)
            return;
        const oldName = String(sheet.name || '');
        const newName = operation.newName || oldName;
        if (oldName !== newName) {
            sheet.name = newName;
            diff.renamedSheets.push({
                sheetKey: operation.sheetKey,
                beforeName: oldName,
                afterName: newName,
            });
        }
    }
    function compileDeleteSheet(context, operation) {
        const { tempData, sheetOrder, deletedSheetKeys, diff } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet)
            return;
        diff.deletedSheets.push({
            sheetKey: operation.sheetKey,
            name: String(sheet.name || ''),
        });
        context.highRiskItems.push({
            type: 'delete_sheet',
            label: `删除表 "${String(sheet.name || operation.sheetKey)}"`,
        });
        deletedSheetKeys.add(operation.sheetKey);
        const index = sheetOrder.indexOf(operation.sheetKey);
        if (index > -1) {
            sheetOrder.splice(index, 1);
        }
        delete tempData[operation.sheetKey];
    }
    function compileMoveSheet(context, operation) {
        const { sheetOrder, diff } = context;
        const fromIndex = sheetOrder.indexOf(operation.sheetKey);
        if (fromIndex === -1)
            return;
        sheetOrder.splice(fromIndex, 1);
        let toIndex;
        if (operation.beforeSheetKey !== undefined && sheetOrder.includes(operation.beforeSheetKey)) {
            toIndex = sheetOrder.indexOf(operation.beforeSheetKey);
        }
        else if (operation.afterSheetKey !== undefined && sheetOrder.includes(operation.afterSheetKey)) {
            toIndex = sheetOrder.indexOf(operation.afterSheetKey) + 1;
        }
        else {
            toIndex = sheetOrder.length;
        }
        sheetOrder.splice(toIndex, 0, operation.sheetKey);
        const sheetName = String(context.tempData[operation.sheetKey]?.name || operation.sheetKey);
        diff.movedSheets.push({
            sheetKey: operation.sheetKey,
            name: sheetName,
            fromIndex,
            toIndex,
        });
    }
    function compilePatchSheetSourceData(context, operation) {
        const { tempData, diff } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet)
            return;
        const changedKeys = [];
        const patch = operation.patch;
        if (patch.note !== undefined) {
            sheet.sourceData = sheet.sourceData || {};
            sheet.sourceData.note = String(patch.note);
            changedKeys.push('note');
        }
        if (patch.initNode !== undefined) {
            sheet.sourceData = sheet.sourceData || {};
            sheet.sourceData.initNode = String(patch.initNode);
            changedKeys.push('initNode');
        }
        if (patch.insertNode !== undefined) {
            sheet.sourceData = sheet.sourceData || {};
            sheet.sourceData.insertNode = String(patch.insertNode);
            changedKeys.push('insertNode');
        }
        if (patch.updateNode !== undefined) {
            sheet.sourceData = sheet.sourceData || {};
            sheet.sourceData.updateNode = String(patch.updateNode);
            changedKeys.push('updateNode');
        }
        if (patch.deleteNode !== undefined) {
            sheet.sourceData = sheet.sourceData || {};
            sheet.sourceData.deleteNode = String(patch.deleteNode);
            changedKeys.push('deleteNode');
        }
        if (changedKeys.length > 0) {
            diff.patchedSourceDataSheets.push({
                sheetKey: operation.sheetKey,
                name: String(sheet.name || operation.sheetKey),
                keys: changedKeys,
            });
        }
    }
    function compilePatchSheetUpdateConfig(context, operation) {
        const { tempData, diff } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet)
            return;
        const changedKeys = [];
        const patch = operation.patch;
        if (patch.contextDepth !== undefined) {
            sheet.updateConfig = sheet.updateConfig || {};
            sheet.updateConfig.contextDepth = Number(patch.contextDepth);
            changedKeys.push('contextDepth');
        }
        if (patch.updateFrequency !== undefined) {
            sheet.updateConfig = sheet.updateConfig || {};
            sheet.updateConfig.updateFrequency = Number(patch.updateFrequency);
            changedKeys.push('updateFrequency');
        }
        if (patch.batchSize !== undefined) {
            sheet.updateConfig = sheet.updateConfig || {};
            sheet.updateConfig.batchSize = Number(patch.batchSize);
            changedKeys.push('batchSize');
        }
        if (patch.groupId !== undefined) {
            sheet.updateConfig = sheet.updateConfig || {};
            sheet.updateConfig.groupId = Number(patch.groupId);
            changedKeys.push('groupId');
        }
        if (patch.skipFloors !== undefined) {
            sheet.updateConfig = sheet.updateConfig || {};
            sheet.updateConfig.skipFloors = Number(patch.skipFloors);
            changedKeys.push('skipFloors');
        }
        if (patch.sendLatestRows !== undefined) {
            sheet.updateConfig = sheet.updateConfig || {};
            sheet.updateConfig.sendLatestRows = Number(patch.sendLatestRows);
            changedKeys.push('sendLatestRows');
        }
        if (changedKeys.length > 0) {
            diff.patchedUpdateConfigSheets.push({
                sheetKey: operation.sheetKey,
                name: String(sheet.name || operation.sheetKey),
                keys: changedKeys,
            });
        }
    }
    function compilePatchSheetExportConfig(context, operation) {
        const { tempData, diff } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet)
            return;
        sheet.exportConfig = { ...sheet.exportConfig, ...operation.patch };
        diff.patchedExportConfigSheets.push({
            sheetKey: operation.sheetKey,
            name: String(sheet.name || operation.sheetKey),
            keys: Object.keys(operation.patch),
        });
    }
    function compilePatchSheetContent(context, operation) {
        const { tempData, diff } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet || !Array.isArray(sheet.content))
            return;
        const changes = [];
        const patch = operation.patch;
        if (patch.updateCells && Array.isArray(patch.updateCells)) {
            patch.updateCells.forEach((cell) => {
                const rowIndex = cell.rowNumber;
                const headers = sheet.content[0] || [];
                const colIndex = headers.indexOf(cell.columnName);
                if (rowIndex >= 1 && rowIndex < sheet.content.length && colIndex >= 0) {
                    sheet.content[rowIndex][colIndex] = cell.value;
                    changes.push(`更新单元格 [${rowIndex}, ${cell.columnName}]`);
                }
            });
        }
        if (patch.addRows && Array.isArray(patch.addRows)) {
            patch.addRows.forEach((row) => {
                const headers = sheet.content[0] || [];
                const newRow = [sheet.content.length];
                headers.forEach((header) => {
                    const key = String(header);
                    newRow.push(key === 'index' ? sheet.content.length : (row[key] || ''));
                });
                sheet.content.push(newRow);
                changes.push(`新增行 ${sheet.content.length - 1}`);
            });
        }
        if (patch.deleteRows && Array.isArray(patch.deleteRows)) {
            patch.deleteRows.sort((a, b) => b - a).forEach((rowNumber) => {
                if (rowNumber >= 1 && rowNumber < sheet.content.length) {
                    sheet.content.splice(rowNumber, 1);
                    sheet.content.forEach((row, index) => {
                        if (index > 0)
                            row[0] = index;
                    });
                    changes.push(`删除行 ${rowNumber}`);
                }
            });
        }
        if (changes.length > 0) {
            diff.patchedContentSheets.push({
                sheetKey: operation.sheetKey,
                name: String(sheet.name || operation.sheetKey),
                changes,
            });
        }
    }
    function compilePatchSheetSchema(context, operation) {
        const { tempData, diff } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet || !Array.isArray(sheet.content))
            return;
        const changes = [];
        const patch = operation.patch;
        context.highRiskItems.push({
            type: 'patch_sheet_schema',
            label: `修改表结构 "${String(sheet.name || operation.sheetKey)}"`,
        });
        if (patch.renameColumns && Array.isArray(patch.renameColumns)) {
            patch.renameColumns.forEach((rename) => {
                const headers = sheet.content[0] || [];
                const index = headers.indexOf(rename.from);
                if (index >= 0) {
                    headers[index] = rename.to;
                    changes.push(`重命名字段: ${rename.from} → ${rename.to}`);
                }
            });
        }
        if (patch.addColumns && Array.isArray(patch.addColumns)) {
            patch.addColumns.forEach((add) => {
                const headers = sheet.content[0] || [];
                if (!headers.includes(add.name)) {
                    headers.push(add.name);
                    sheet.content.forEach((row, index) => {
                        if (index > 0) {
                            row.push(add.defaultValue || '');
                        }
                    });
                    changes.push(`新增字段: ${add.name}`);
                }
            });
        }
        if (patch.deleteColumns && Array.isArray(patch.deleteColumns)) {
            patch.deleteColumns.sort((a, b) => {
                const headers = sheet.content[0] || [];
                return headers.indexOf(b) - headers.indexOf(a);
            }).forEach((colName) => {
                const headers = sheet.content[0] || [];
                const index = headers.indexOf(colName);
                if (index > 0) {
                    headers.splice(index, 1);
                    sheet.content.forEach((row) => {
                        row.splice(index, 1);
                    });
                    changes.push(`删除字段: ${colName}`);
                }
            });
        }
        if (patch.ddl) {
            changes.push(`DDL: ${patch.ddl}`);
        }
        if (changes.length > 0) {
            diff.patchedSchemaSheets.push({
                sheetKey: operation.sheetKey,
                name: String(sheet.name || operation.sheetKey),
                changes,
            });
        }
    }
    function compilePatchSheetLocks(context, operation) {
        const { tempData, diff, lockChanges } = context;
        const sheet = tempData[operation.sheetKey];
        if (!sheet)
            return;
        const changes = [];
        const patch = operation.patch;
        const lockChange = {
            sheetKey: operation.sheetKey,
            rows: [],
            columns: [],
            cells: [],
        };
        if (patch.rows && Array.isArray(patch.rows)) {
            patch.rows.forEach((row) => {
                lockChange.rows.push({ rowIndex: row.rowNumber, locked: row.locked });
                changes.push(`行 ${row.rowNumber} 锁定状态: ${row.locked}`);
            });
        }
        if (patch.columns && Array.isArray(patch.columns)) {
            patch.columns.forEach((col) => {
                const headers = sheet.content?.[0] || [];
                const colIndex = headers.indexOf(col.columnName);
                if (colIndex >= 0) {
                    lockChange.columns.push({ colIndex, locked: col.locked });
                    changes.push(`列 ${col.columnName} 锁定状态: ${col.locked}`);
                }
            });
        }
        if (patch.cells && Array.isArray(patch.cells)) {
            patch.cells.forEach((cell) => {
                const headers = sheet.content?.[0] || [];
                const colIndex = headers.indexOf(cell.columnName);
                if (colIndex >= 0) {
                    lockChange.cells.push({ rowIndex: cell.rowNumber, colIndex, locked: cell.locked });
                    changes.push(`单元格 [${cell.rowNumber}, ${cell.columnName}] 锁定状态: ${cell.locked}`);
                }
            });
        }
        if (patch.specialIndexLocked !== undefined) {
            lockChange.specialIndexLocked = patch.specialIndexLocked;
            changes.push(`索引列锁定状态: ${patch.specialIndexLocked}`);
        }
        if (lockChange.rows.length > 0 || lockChange.columns.length > 0 || lockChange.cells.length > 0 || lockChange.specialIndexLocked !== undefined) {
            lockChanges.push(lockChange);
        }
        if (changes.length > 0) {
            diff.patchedLockSheets.push({
                sheetKey: operation.sheetKey,
                name: String(sheet.name || operation.sheetKey),
                changes,
            });
        }
    }
    function compilePatchGlobalInjectionConfig(context, operation) {
        const { diff } = context;
        context.highRiskItems.push({
            type: 'patch_global_injection_config',
            label: '修改全局注入配置',
        });
        diff.globalInjectionChanged = true;
    }
    function compileOperation(context, operation) {
        switch (operation.op) {
            case 'add_sheet':
                compileAddSheet(context, operation);
                break;
            case 'rename_sheet':
                compileRenameSheet(context, operation);
                break;
            case 'delete_sheet':
                compileDeleteSheet(context, operation);
                break;
            case 'move_sheet':
                compileMoveSheet(context, operation);
                break;
            case 'patch_sheet_source_data':
                compilePatchSheetSourceData(context, operation);
                break;
            case 'patch_sheet_update_config':
                compilePatchSheetUpdateConfig(context, operation);
                break;
            case 'patch_sheet_export_config':
                compilePatchSheetExportConfig(context, operation);
                break;
            case 'patch_sheet_content':
                compilePatchSheetContent(context, operation);
                break;
            case 'patch_sheet_schema':
                compilePatchSheetSchema(context, operation);
                break;
            case 'patch_sheet_locks':
                compilePatchSheetLocks(context, operation);
                break;
            case 'patch_global_injection_config':
                compilePatchGlobalInjectionConfig(context);
                break;
        }
    }
    function compileTemplateAssistantDraft(input) {
        const tempData = clone(input.tempData || {});
        const sheetOrder = [...(input.sheetOrder || Object.keys(tempData).filter(k => k.startsWith('sheet_')))];
        const context = {
            tempData,
            sheetOrder,
            currentSheetKey: input.currentSheetKey,
            draft: input.draft,
            deletedSheetKeys: new Set(),
            focusSheetKey: input.currentSheetKey,
            diff: createEmptyDiff(),
            highRiskItems: [],
            lockChanges: [],
        };
        input.draft.operations.forEach((operation) => {
            try {
                compileOperation(context, operation);
            }
            catch (error) {
                console.warn('编译操作失败:', operation, error);
            }
        });
        const result = {
            candidateData: tempData,
            orderedSheetKeys: sheetOrder,
            deletedSheetKeys: Array.from(context.deletedSheetKeys),
            focusSheetKey: context.focusSheetKey,
            diff: context.diff,
            highRiskItems: context.highRiskItems,
            lockChanges: context.lockChanges,
        };
        return result;
    }

    function buildSystemPrompt() {
        return [
            '你是一个专业的数据库表格处理助手。',
            '你只能输出一个被 <templateAssistantDraft> 和 </templateAssistantDraft> 包裹的 JSON 对象，不能输出解释文本。',
            '严格使用 protocolVersion=2、mode="modify_current_template_incremental"、atomic=true。',
            '如果需求信息不足、字段缺失、或当前协议无法安全表达，仍然必须返回合法 draft：summary 简述原因、warnings 写明原因、operations 输出空数组；不要输出追问文本。',
            '严格只允许以下操作：add_sheet、rename_sheet、delete_sheet、move_sheet、patch_sheet_source_data、patch_sheet_update_config、patch_sheet_export_config、patch_sheet_content、patch_sheet_schema、patch_sheet_locks、patch_global_injection_config。',
            '每个 operations[i] 必须使用 op 字段表示操作名；禁止使用 type、operation、action 等别名。',
            'add_sheet 必须同时提供非空 sheetName 和至少一个 headers 项；应尽量同时提供 sourceData.note、sourceData.initNode、sourceData.insertNode、sourceData.updateNode、sourceData.deleteNode。',
            '新建表时，sourceData.note 要写清这张表记录什么、一行代表什么、是单行表还是多行表、各列含义、哪列可以作为稳定标识。',
            '示例 add_sheet：{"op":"add_sheet","sheetName":"角色关系表","headers":["角色A","角色B","关系","备注"]}。',
        ].join('\n');
    }
    function extractHeaders(sheet) {
        return Array.isArray(sheet?.content?.[0])
            ? sheet.content[0].slice(1).map((item) => String(item ?? ''))
            : [];
    }
    function getSheetSnapshot(tempData, sheetKey) {
        const sheet = tempData?.[sheetKey] || {};
        return {
            sheetKey,
            name: String(sheet?.name || ''),
            orderNo: Number.isFinite(sheet?.orderNo) ? sheet.orderNo : null,
            headers: extractHeaders(sheet),
            content: clone(Array.isArray(sheet?.content) ? sheet.content : []),
            sourceData: clone(sheet?.sourceData || {}),
            updateConfig: clone(sheet?.updateConfig || {}),
            exportConfig: clone(sheet?.exportConfig || {}),
        };
    }
    function buildSheetSummary(tempData) {
        const sheetKeys = Object.keys(tempData || {}).filter(k => k.startsWith('sheet_'));
        return sheetKeys.map((sheetKey) => {
            const sheet = tempData[sheetKey] || {};
            return {
                sheetKey,
                name: String(sheet.name || ''),
                orderNo: Number.isFinite(sheet.orderNo) ? sheet.orderNo : null,
                headers: extractHeaders(sheet),
                rowCount: Math.max(0, (Array.isArray(sheet?.content) ? sheet.content.length : 0) - 1),
            };
        });
    }
    function buildDetailedSheetSnapshots(tempData) {
        return buildSheetSummary(tempData).map((item) => getSheetSnapshot(tempData, item.sheetKey));
    }
    function buildTemplateAssistantFingerprint(tempData) {
        const normalized = tempData || {};
        const sheetKeys = Object.keys(normalized).filter(k => k.startsWith('sheet_'));
        const snapshot = {
            sheets: sheetKeys.map((sheetKey) => {
                const sheet = normalized[sheetKey] || {};
                return {
                    sheetKey,
                    name: sheet.name ?? '',
                    content: Array.isArray(sheet?.content) ? sheet.content : [],
                };
            }),
        };
        return `ai-table-tool:${hashString(JSON.stringify(snapshot))}`;
    }
    function getLastTaggedDraftText(aiText) {
        const tagPattern = /<templateAssistantDraft>([\s\S]*?)<\/templateAssistantDraft>/g;
        const matches = Array.from(String(aiText || '').matchAll(tagPattern));
        if (!matches.length) {
            throw new Error('AI 响应中未找到 <templateAssistantDraft> 标签');
        }
        return String(matches[matches.length - 1][1] || '').trim();
    }
    function parseTemplateAssistantDraft(aiText) {
        const jsonText = getLastTaggedDraftText(aiText);
        let parsed = null;
        try {
            parsed = JSON.parse(jsonText);
        }
        catch (error) {
            throw new Error(`JSON 解析失败: ${error?.message || '未知错误'}`);
        }
        return validateTemplateAssistantDraft(parsed);
    }
    function validateTemplateAssistantDraft(draft) {
        if (!draft || typeof draft !== 'object') {
            throw new Error('draft 必须是对象');
        }
        if (draft.protocolVersion !== 1 && draft.protocolVersion !== 2) {
            throw new Error('protocolVersion 必须为 1 或 2');
        }
        if (draft.mode !== 'modify_current_template_incremental') {
            throw new Error('mode 非法');
        }
        if (typeof draft.baseFingerprint !== 'string' || !draft.baseFingerprint.trim()) {
            throw new Error('baseFingerprint 缺失');
        }
        if (typeof draft.selectedSheetKey !== 'string' || !draft.selectedSheetKey.trim()) {
            throw new Error('selectedSheetKey 必须是非空字符串');
        }
        if (!Array.isArray(draft.operations)) {
            throw new Error('operations 必须是数组');
        }
        const protocolVersion = draft.protocolVersion;
        const normalized = {
            protocolVersion,
            mode: 'modify_current_template_incremental',
            baseFingerprint: draft.baseFingerprint,
            selectedSheetKey: String(draft.selectedSheetKey || ''),
            summary: String(draft.summary || ''),
            warnings: Array.isArray(draft.warnings) ? draft.warnings.map((item) => String(item ?? '')) : [],
            operations: draft.operations.map((item) => clone(item)),
        };
        if (protocolVersion === 2) {
            return {
                ...normalized,
                protocolVersion: 2,
                requestId: String(draft.requestId || generateId()),
                atomic: true,
            };
        }
        return normalized;
    }
    function buildUserPrompt(input, baseFingerprint) {
        const tempData = input.tempData;
        const payload = {
            userRequest: String(input.userRequest || '').trim(),
            baseFingerprint,
            selectedSheetKey: input.currentSheetKey || '',
            selectedSheet: input.currentSheetKey ? getSheetSnapshot(tempData, input.currentSheetKey) : null,
            sheetCount: buildSheetSummary(tempData).length,
            allSheets: buildDetailedSheetSnapshots(tempData),
            constraints: {
                protocolVersion: 2,
                requestIdRequired: true,
                atomicOnly: true,
                allowCrossSheetPatch: true,
            },
        };
        return JSON.stringify(payload);
    }
    function buildMessages(input, baseFingerprint) {
        const messages = [
            { role: 'system', content: buildSystemPrompt() },
        ];
        if (input.priorTurns && Array.isArray(input.priorTurns)) {
            input.priorTurns.forEach((turn) => {
                if (turn.user) {
                    messages.push({ role: 'user', content: turn.user });
                }
                if (turn.assistant) {
                    messages.push({ role: 'assistant', content: turn.assistant });
                }
            });
        }
        messages.push({ role: 'user', content: buildUserPrompt(input, baseFingerprint) });
        return messages;
    }
    async function callAIWithPreset(messages, preset) {
        const apiPresets = window.settings?.apiPresets || [];
        const effectivePreset = preset || apiPresets.find((p) => p.isDefault)?.name || apiPresets[0]?.name;
        return new Promise((resolve, reject) => {
            window.callApi({
                preset: effectivePreset,
                messages,
                systemPrompt: '',
                maxTokens: 4096,
                temperature: 0.7,
            }, (response) => {
                if (response.success) {
                    resolve(response.text);
                }
                else {
                    reject(new Error(response.error || 'API调用失败'));
                }
            });
        });
    }
    async function generateTemplateAssistantDraft(input) {
        const tempData = input.tempData || {};
        const userRequest = String(input.userRequest || '').trim();
        if (!userRequest) {
            throw new Error('请输入改表需求');
        }
        const baseFingerprint = buildTemplateAssistantFingerprint(tempData);
        const messages = buildMessages({ ...input, tempData }, baseFingerprint);
        const aiRawText = await callAIWithPreset(messages, input.tableApiPreset);
        if (!aiRawText) {
            throw new Error('AI 未返回有效内容');
        }
        let draft;
        try {
            draft = parseTemplateAssistantDraft(aiRawText);
        }
        catch (error) {
            throw error;
        }
        if (draft.baseFingerprint !== baseFingerprint) {
            throw new Error('AI 返回的 baseFingerprint 与当前结构不一致');
        }
        const compileResult = compileTemplateAssistantDraft({
            tempData,
            sheetOrder: input.sheetOrder,
            currentSheetKey: input.currentSheetKey,
            draft,
        });
        return {
            draft,
            aiRawText,
            messages,
            compileResult,
        };
    }

    const PLUGIN_ID = 'ai-table-tool';
    class AITableToolPlugin {
        constructor() {
            this.chatPanel = null;
            this.isInitialized = false;
        }
        init() {
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
        setupContainer() {
            const container = document.createElement('div');
            container.id = PLUGIN_ID;
            document.body.appendChild(container);
        }
        setupStyles() {
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = this.getPluginUrl('dist/style.css');
            document.head.appendChild(styleLink);
        }
        getPluginUrl(path) {
            const script = document.querySelector(`script[src*="${PLUGIN_ID}"]`);
            if (script) {
                const scriptUrl = script.getAttribute('src') || '';
                return scriptUrl.replace(/dist\/main\.js$/, path);
            }
            return `plugins/${PLUGIN_ID}/${path}`;
        }
        setupChatPanel() {
            const container = document.getElementById(PLUGIN_ID);
            if (!container)
                return;
            this.chatPanel = new ChatPanel(container, this.handleGenerate.bind(this), this.handleApply.bind(this));
        }
        async handleGenerate(request) {
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
        handleApply(result) {
            const success = this.applyDraftToEditor(result);
            if (success) {
                this.showToast('success', '表格已成功更新');
            }
            else {
                this.showToast('error', '应用失败，数据结构可能已变化');
            }
        }
        getCurrentTempData() {
            const tavernState = window.tavern?.state || {};
            return tavernState.tempData || {};
        }
        getCurrentSheetKey() {
            const tavernState = window.tavern?.state || {};
            return tavernState.currentSheetKey || null;
        }
        getCurrentSheetOrder() {
            const tavernState = window.tavern?.state || {};
            return tavernState.sheetOrder || [];
        }
        applyDraftToEditor(result) {
            const { draft, compileResult } = result;
            const tavernState = window.tavern?.state;
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
        triggerEditorRefresh() {
            const event = new CustomEvent('ai-table-tool:refresh', {
                detail: { source: PLUGIN_ID },
            });
            document.dispatchEvent(event);
            if (window.tavern?.refresh) {
                window.tavern.refresh();
            }
        }
        showToast(type, message) {
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
        generateDraft(request) {
            return this.handleGenerate(request);
        }
        applyDraft(result) {
            return this.applyDraftToEditor(result);
        }
    }
    const plugin = new AITableToolPlugin();
    window.AITableTool = {
        init: () => plugin.init(),
        generateDraft: (request) => plugin.generateDraft(request),
        applyDraft: (result) => plugin.applyDraft(result),
    };
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            plugin.init();
        }, 1000);
    });

    exports.AITableToolPlugin = plugin;

    return exports;

})({});
//# sourceMappingURL=main.js.map
