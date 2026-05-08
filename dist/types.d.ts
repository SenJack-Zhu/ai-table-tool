export interface TableSchema {
    name: string;
    columns: Column[];
}
export interface Column {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'text';
    defaultValue?: any;
    required?: boolean;
}
export interface TableRow {
    rowId: string;
    [key: string]: any;
}
export interface TableData {
    schema: TableSchema;
    rows: TableRow[];
}
export interface TemplateAssistantAddSheetOperation {
    op: 'add_sheet';
    sheetName: string;
    headers: string[];
    insertAfterSheetKey?: string;
    sourceData?: Record<string, any>;
    updateConfig?: Record<string, any>;
    exportConfig?: Record<string, any>;
}
export interface TemplateAssistantRenameSheetOperation {
    op: 'rename_sheet';
    sheetKey: string;
    newName: string;
}
export interface TemplateAssistantDeleteSheetOperation {
    op: 'delete_sheet';
    sheetKey: string;
}
export interface TemplateAssistantMoveSheetOperation {
    op: 'move_sheet';
    sheetKey: string;
    beforeSheetKey?: string;
    afterSheetKey?: string;
}
export interface TemplateAssistantPatchSheetSourceDataPatch {
    note?: string;
    initNode?: string;
    insertNode?: string;
    updateNode?: string;
    deleteNode?: string;
}
export interface TemplateAssistantPatchSheetUpdateConfigPatch {
    contextDepth?: number;
    updateFrequency?: number;
    batchSize?: number;
    groupId?: number;
    skipFloors?: number;
    sendLatestRows?: number;
}
export interface TemplateAssistantContentUpdateCell {
    rowNumber: number;
    columnName: string;
    value: any;
}
export interface TemplateAssistantContentAddRow {
    [columnName: string]: any;
}
export interface TemplateAssistantPatchSheetContentPatch {
    updateCells?: TemplateAssistantContentUpdateCell[];
    addRows?: TemplateAssistantContentAddRow[];
    deleteRows?: number[];
}
export interface TemplateAssistantSchemaRenameColumn {
    from: string;
    to: string;
}
export interface TemplateAssistantSchemaAddColumn {
    name: string;
    defaultValue?: any;
}
export interface TemplateAssistantPatchSheetSchemaPatch {
    renameColumns?: TemplateAssistantSchemaRenameColumn[];
    addColumns?: TemplateAssistantSchemaAddColumn[];
    deleteColumns?: string[];
    ddl?: string;
}
export interface TemplateAssistantLockRowPatch {
    rowNumber: number;
    locked: boolean;
}
export interface TemplateAssistantLockColumnPatch {
    columnName: string;
    locked: boolean;
}
export interface TemplateAssistantLockCellPatch {
    rowNumber: number;
    columnName: string;
    locked: boolean;
}
export interface TemplateAssistantPatchSheetLocksPatch {
    rows?: TemplateAssistantLockRowPatch[];
    columns?: TemplateAssistantLockColumnPatch[];
    cells?: TemplateAssistantLockCellPatch[];
    specialIndexLocked?: boolean;
}
export interface TemplateAssistantPatchSheetSourceDataOperation {
    op: 'patch_sheet_source_data';
    sheetKey: string;
    patch: TemplateAssistantPatchSheetSourceDataPatch;
}
export interface TemplateAssistantPatchSheetUpdateConfigOperation {
    op: 'patch_sheet_update_config';
    sheetKey: string;
    patch: TemplateAssistantPatchSheetUpdateConfigPatch;
}
export interface TemplateAssistantPatchSheetExportConfigOperation {
    op: 'patch_sheet_export_config';
    sheetKey: string;
    patch: Record<string, any>;
}
export interface TemplateAssistantPatchSheetContentOperation {
    op: 'patch_sheet_content';
    sheetKey: string;
    patch: TemplateAssistantPatchSheetContentPatch;
}
export interface TemplateAssistantPatchSheetSchemaOperation {
    op: 'patch_sheet_schema';
    sheetKey: string;
    patch: TemplateAssistantPatchSheetSchemaPatch;
}
export interface TemplateAssistantPatchSheetLocksOperation {
    op: 'patch_sheet_locks';
    sheetKey: string;
    patch: TemplateAssistantPatchSheetLocksPatch;
}
export interface TemplateAssistantPatchGlobalInjectionConfigOperation {
    op: 'patch_global_injection_config';
    patch: Record<string, any>;
}
export type TemplateAssistantOperation = TemplateAssistantAddSheetOperation | TemplateAssistantRenameSheetOperation | TemplateAssistantDeleteSheetOperation | TemplateAssistantMoveSheetOperation | TemplateAssistantPatchSheetSourceDataOperation | TemplateAssistantPatchSheetUpdateConfigOperation | TemplateAssistantPatchSheetExportConfigOperation | TemplateAssistantPatchSheetContentOperation | TemplateAssistantPatchSheetSchemaOperation | TemplateAssistantPatchSheetLocksOperation | TemplateAssistantPatchGlobalInjectionConfigOperation;
export interface TemplateAssistantDraft {
    protocolVersion: 1 | 2;
    mode: 'modify_current_template_incremental';
    baseFingerprint: string;
    requestId?: string;
    atomic?: boolean;
    selectedSheetKey: string;
    summary: string;
    warnings: string[];
    operations: TemplateAssistantOperation[];
}
export interface TemplateAssistantPriorTurn {
    user: string;
    assistant?: string;
}
export interface TemplateAssistantGenerateInput {
    tempData: Record<string, any>;
    currentSheetKey: string | null;
    sheetOrder?: string[] | null;
    userRequest: string;
    priorTurns?: TemplateAssistantPriorTurn[] | null;
    tableApiPreset?: string;
}
export interface TemplateAssistantDiff {
    addedSheets: Array<{
        sheetKey: string;
        name: string;
    }>;
    deletedSheets: Array<{
        sheetKey: string;
        name: string;
    }>;
    renamedSheets: Array<{
        sheetKey: string;
        beforeName: string;
        afterName: string;
    }>;
    movedSheets: Array<{
        sheetKey: string;
        name: string;
        fromIndex: number;
        toIndex: number;
    }>;
    patchedSourceDataSheets: Array<{
        sheetKey: string;
        name: string;
        keys: string[];
    }>;
    patchedUpdateConfigSheets: Array<{
        sheetKey: string;
        name: string;
        keys: string[];
    }>;
    patchedExportConfigSheets: Array<{
        sheetKey: string;
        name: string;
        keys: string[];
    }>;
    patchedContentSheets: Array<{
        sheetKey: string;
        name: string;
        changes: string[];
    }>;
    patchedSchemaSheets: Array<{
        sheetKey: string;
        name: string;
        changes: string[];
    }>;
    patchedLockSheets: Array<{
        sheetKey: string;
        name: string;
        changes: string[];
    }>;
    globalInjectionChanged: boolean;
}
export interface TemplateAssistantHighRiskItem {
    type: 'delete_sheet' | 'patch_global_injection_config' | 'patch_sheet_schema';
    label: string;
}
export interface TemplateAssistantCompileResult {
    candidateData: Record<string, any>;
    orderedSheetKeys: string[];
    deletedSheetKeys: string[];
    focusSheetKey: string | null;
    diff: TemplateAssistantDiff;
    highRiskItems: TemplateAssistantHighRiskItem[];
    lockChanges: Array<{
        sheetKey: string;
        rows: Array<{
            rowIndex: number;
            locked: boolean;
        }>;
        columns: Array<{
            colIndex: number;
            locked: boolean;
        }>;
        cells: Array<{
            rowIndex: number;
            colIndex: number;
            locked: boolean;
        }>;
        specialIndexLocked?: boolean;
    }>;
}
export interface TemplateAssistantGenerateResult {
    draft: TemplateAssistantDraft;
    aiRawText: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
    compileResult: TemplateAssistantCompileResult;
    originalBaseFingerprint?: string;
}
export type ChatTurnType = 'user' | 'assistant' | 'error';
export interface ChatTurn {
    id: string;
    type: ChatTurnType;
    content: string;
    timestamp: number;
    summary?: string;
    draft?: TemplateAssistantDraft;
    compileResult?: TemplateAssistantCompileResult;
    aiRawText?: string;
    errorMessage?: string;
}
export interface PluginState {
    isOpen: boolean;
    isGenerating: boolean;
    transcript: ChatTurn[];
    userRequest: string;
    maxRounds: number;
    tableApiPreset: string;
    currentSheetKey: string | null;
}
