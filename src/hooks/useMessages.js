export function useUnreadCount() { return 0 }
export function useMessages() { return { threads: [], loading: true, error: '' } }
export function useThread() { return { messages: [], loading: true, error: '', send: async () => {} } }
