/** How long a deleted item stays recoverable via the "Undo" toast. Used by
 *  both trashRepository (data TTL) and ToastContext (display duration) so
 *  the two can never drift out of sync. */
export const UNDO_WINDOW_MS = 8000
