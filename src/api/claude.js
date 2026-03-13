// Deprecated: API calls now go through Vercel serverless functions
// Re-export from the new API layer for backward compatibility
export { streamChatFromServer as streamChat } from '../lib/api.js'
