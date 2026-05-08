import type {
    TemplateAssistantDraft,
    TemplateAssistantCompileResult,
    TemplateAssistantDiff,
    TemplateAssistantHighRiskItem,
    TemplateAssistantOperation,
    TemplateAssistantAddSheetOperation,
    TemplateAssistantRenameSheetOperation,
    TemplateAssistantDeleteSheetOperation,
    TemplateAssistantMoveSheetOperation,
    TemplateAssistantPatchSheetSourceDataOperation,
    TemplateAssistantPatchSheetUpdateConfigOperation,
    TemplateAssistantPatchSheetExportConfigOperation,
    TemplateAssistantPatchSheetContentOperation,
    TemplateAssistantPatchSheetSchemaOperation,
    TemplateAssistantPatchSheetLocksOperation,
    TemplateAssistantPatchGlobalInjectionConfigOperation,
} from '../types';
import { clone } from '../utils';

interface CompileContext {
    tempData: Record<string, any>;
    sheetOrder: string[];
    currentSheetKey: string | null;
    draft: TemplateAssistantDraft;
    deletedSheetKeys: Set<string>;
    focusSheetKey: string | null;
    diff: TemplateAssistantDiff;
    highRiskItems: TemplateAssistantHighRiskItem[];
    lockChanges: Array<{
        sheetKey: string;
        rows: Array<{ rowIndex: number; locked: boolean }>;
        columns: Array<{ colIndex: number; locked: boolean }>;
        cells: Array<{ rowIndex: number; colIndex: number; locked: boolean }>;
        specialIndexLocked?: boolean;
    }>;
}

function createEmptyDiff(): TemplateAssistantDiff {
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

function createEmptyCompileResult(tempData: Record<string, any>, sheetOrder: string[]): TemplateAssistantCompileResult {
    return {
        candidateData: clone(tempData),
        orderedSheetKeys: [...sheetOrder],
        deletedSheetKeys: [],
        focusSheetKey: null,
        diff: createEmptyDiff(),
        highRiskItems: [],
        lockChanges: [],
    };
}

function compileAddSheet(context: CompileContext, operation: TemplateAssistantAddSheetOperation): void {
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
    } else {
        sheetOrder.push(newSheetKey);
    }
    
    if (deletedSheetKeys.has(newSheetKey)) {
        deletedSheetKeys.delete(newSheetKey);
    }
    
    diff.addedSheets.push({ sheetKey: newSheetKey, name: newSheet.name });
    context.focusSheetKey = newSheetKey;
}

function compileRenameSheet(context: CompileContext, operation: TemplateAssistantRenameSheetOperation): void {
    const { tempData, diff } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet) return;
    
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

function compileDeleteSheet(context: CompileContext, operation: TemplateAssistantDeleteSheetOperation): void {
    const { tempData, sheetOrder, deletedSheetKeys, diff } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet) return;
    
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

function compileMoveSheet(context: CompileContext, operation: TemplateAssistantMoveSheetOperation): void {
    const { sheetOrder, diff } = context;
    const fromIndex = sheetOrder.indexOf(operation.sheetKey);
    
    if (fromIndex === -1) return;
    
    sheetOrder.splice(fromIndex, 1);
    
    let toIndex: number;
    if (operation.beforeSheetKey !== undefined && sheetOrder.includes(operation.beforeSheetKey)) {
        toIndex = sheetOrder.indexOf(operation.beforeSheetKey);
    } else if (operation.afterSheetKey !== undefined && sheetOrder.includes(operation.afterSheetKey)) {
        toIndex = sheetOrder.indexOf(operation.afterSheetKey) + 1;
    } else {
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

function compilePatchSheetSourceData(context: CompileContext, operation: TemplateAssistantPatchSheetSourceDataOperation): void {
    const { tempData, diff } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet) return;
    
    const changedKeys: string[] = [];
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

function compilePatchSheetUpdateConfig(context: CompileContext, operation: TemplateAssistantPatchSheetUpdateConfigOperation): void {
    const { tempData, diff } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet) return;
    
    const changedKeys: string[] = [];
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

function compilePatchSheetExportConfig(context: CompileContext, operation: TemplateAssistantPatchSheetExportConfigOperation): void {
    const { tempData, diff } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet) return;
    
    sheet.exportConfig = { ...sheet.exportConfig, ...operation.patch };
    
    diff.patchedExportConfigSheets.push({
        sheetKey: operation.sheetKey,
        name: String(sheet.name || operation.sheetKey),
        keys: Object.keys(operation.patch),
    });
}

function compilePatchSheetContent(context: CompileContext, operation: TemplateAssistantPatchSheetContentOperation): void {
    const { tempData, diff } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet || !Array.isArray(sheet.content)) return;
    
    const changes: string[] = [];
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
            const newRow: any[] = [sheet.content.length];
            headers.forEach((header: any) => {
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
                sheet.content.forEach((row: any[], index: number) => {
                    if (index > 0) row[0] = index;
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

function compilePatchSheetSchema(context: CompileContext, operation: TemplateAssistantPatchSheetSchemaOperation): void {
    const { tempData, diff } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet || !Array.isArray(sheet.content)) return;
    
    const changes: string[] = [];
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
                sheet.content.forEach((row: any[], index: number) => {
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
                sheet.content.forEach((row: any[]) => {
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

function compilePatchSheetLocks(context: CompileContext, operation: TemplateAssistantPatchSheetLocksOperation): void {
    const { tempData, diff, lockChanges } = context;
    const sheet = tempData[operation.sheetKey];
    
    if (!sheet) return;
    
    const changes: string[] = [];
    const patch = operation.patch;
    const lockChange = {
        sheetKey: operation.sheetKey,
        rows: [] as Array<{ rowIndex: number; locked: boolean }>,
        columns: [] as Array<{ colIndex: number; locked: boolean }>,
        cells: [] as Array<{ rowIndex: number; colIndex: number; locked: boolean }>,
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

function compilePatchGlobalInjectionConfig(context: CompileContext, operation: TemplateAssistantPatchGlobalInjectionConfigOperation): void {
    const { diff } = context;
    
    context.highRiskItems.push({
        type: 'patch_global_injection_config',
        label: '修改全局注入配置',
    });
    
    diff.globalInjectionChanged = true;
}

function compileOperation(context: CompileContext, operation: TemplateAssistantOperation): void {
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
            compilePatchGlobalInjectionConfig(context, operation);
            break;
        default:
            break;
    }
}

interface CompileInput {
    tempData: Record<string, any>;
    sheetOrder: string[] | null;
    currentSheetKey: string | null;
    draft: TemplateAssistantDraft;
}

export function compileTemplateAssistantDraft(input: CompileInput): TemplateAssistantCompileResult {
    const tempData = clone(input.tempData || {});
    const sheetOrder = [...(input.sheetOrder || Object.keys(tempData).filter(k => k.startsWith('sheet_')))];
    
    const context: CompileContext = {
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
        } catch (error) {
            console.warn('编译操作失败:', operation, error);
        }
    });
    
    const result: TemplateAssistantCompileResult = {
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
