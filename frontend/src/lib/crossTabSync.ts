import { queryClient } from './queryClient';

const CHANNEL_NAME = 'finance-app-query-sync';

interface SyncMessage {
    type: 'invalidate';
    queryKeys: string[][];
}

let channel: BroadcastChannel | null = null;

export function initCrossTabSync(): void {
    if (typeof BroadcastChannel === 'undefined') return;

    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        if (event.data.type === 'invalidate') {
            for (const key of event.data.queryKeys) {
                queryClient.invalidateQueries({ queryKey: key });
            }
        }
    };
}

export function broadcastInvalidation(queryKeys: string[][]): void {
    if (!channel) return;
    channel.postMessage({ type: 'invalidate', queryKeys } satisfies SyncMessage);
}

export function destroyCrossTabSync(): void {
    channel?.close();
    channel = null;
}
