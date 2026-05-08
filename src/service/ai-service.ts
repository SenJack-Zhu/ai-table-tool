import type { 
    TemplateAssistantDraft, 
    TemplateAssistantGenerateInput, 
    TemplateAssistantGenerateResult,
    TemplateAssistantCompileResult 
} from '../types';
import { clone, hashString } from '../utils';
import { compileTemplateAssistantDraft } from './compiler';

const TEMPLATE_ASSISTANT_SOURCE_DATA_ALLOWED_KEYS = ['note', 'initNode', 'insertNode', 'deleteNode'] as const;

function buildSystemPrompt(): string {
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

function extractHeaders(sheet: any): string[] {
    return Array.isArray(sheet?.content?.[0]) 
        ? sheet.content[0].slice(1).map((item: any) => String(item ?? '')) 
        : [];
}

function getSheetSnapshot(tempData: Record<string, any>, sheetKey: string) {
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

function buildSheetSummary(tempData: Record<string, any>) {
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

function buildDetailedSheetSnapshots(tempData: Record<string, any>) {
    return buildSheetSummary(tempData).map((item) => getSheetSnapshot(tempData, item.sheetKey));
}

export function buildTemplateAssistantFingerprint(tempData: Record<string, any>): string {
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

function getLastTaggedDraftText(aiText: string): string {
    const tagPattern = /<templateAssistantDraft>([\s\S]*?)<\/templateAssistantDraft>/g;
    const matches = Array.from(String(aiText || '').matchAll(tagPattern));
    if (!matches.length) {
        throw new Error('AI 响应中未找到 <templateAssistantDraft> 标签');
    }
    return String(matches[matches.length - 1][1] || '').trim();
}

export function parseTemplateAssistantDraft(aiText: string): TemplateAssistantDraft {
    const jsonText = getLastTaggedDraftText(aiText);
    let parsed: any = null;
    try {
        parsed = JSON.parse(jsonText);
    } catch (error: any) {
        throw new Error(`JSON 解析失败: ${error?.message || '未知错误'}`);
    }
    return validateTemplateAssistantDraft(parsed);
}

function validateTemplateAssistantDraft(draft: any): TemplateAssistantDraft {
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

    const protocolVersion = draft.protocolVersion as 1 | 2;
    
    const normalized = {
        protocolVersion,
        mode: 'modify_current_template_incremental' as const,
        baseFingerprint: draft.baseFingerprint,
        selectedSheetKey: String(draft.selectedSheetKey || ''),
        summary: String(draft.summary || ''),
        warnings: Array.isArray(draft.warnings) ? draft.warnings.map((item: any) => String(item ?? '')) : [],
        operations: draft.operations.map((item: any) => clone(item)),
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

function buildUserPrompt(input: TemplateAssistantGenerateInput, baseFingerprint: string): string {
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

function buildMessages(input: TemplateAssistantGenerateInput, baseFingerprint: string): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [
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

async function callAIWithPreset(messages: Array<{ role: string; content: string }>, preset?: string): Promise<string> {
    const apiPresets = (window as any).settings?.apiPresets || [];
    const effectivePreset = preset || apiPresets.find((p: any) => p.isDefault)?.name || apiPresets[0]?.name;

    return new Promise((resolve, reject) => {
        (window as any).callApi({
            preset: effectivePreset,
            messages,
            systemPrompt: '',
            maxTokens: 4096,
            temperature: 0.7,
        }, (response: any) => {
            if (response.success) {
                resolve(response.text);
            } else {
                reject(new Error(response.error || 'API调用失败'));
            }
        });
    });
}

export async function generateTemplateAssistantDraft(input: TemplateAssistantGenerateInput): Promise<TemplateAssistantGenerateResult> {
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

    let draft: TemplateAssistantDraft;
    try {
        draft = parseTemplateAssistantDraft(aiRawText);
    } catch (error: any) {
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
