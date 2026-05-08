export function clone<T>(value: T): T {
    if (value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
}

export function isObject(value: any): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
