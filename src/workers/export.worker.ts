/**
 * NoteNirman 2.0 P5.10 — Off-Main-Thread Export & Compression Worker
 */

export interface ExportWorkerMessage {
  type: 'PREPARE_BATCH_EXPORT' | 'PROCESS_SEARCH_INDEX';
  payload: {
    items: Array<{ id: string; content: string; title: string }>;
    format?: 'markdown' | 'json' | 'html';
  };
}

export interface ExportWorkerResponse {
  type: 'EXPORT_BATCH_SUCCESS' | 'EXPORT_BATCH_ERROR';
  result?: Array<{ id: string; filename: string; blobText: string }>;
  error?: string;
}

// Global scope check for Web Worker environment
if (typeof self !== 'undefined') {
  self.onmessage = (event: MessageEvent<ExportWorkerMessage>) => {
    const { type, payload } = event.data;

    try {
      if (type === 'PREPARE_BATCH_EXPORT') {
        const result = payload.items.map(item => {
          const ext = payload.format === 'json' ? 'json' : payload.format === 'html' ? 'html' : 'md';
          const sanitizedTitle = (item.title || 'Untitled').replace(/[^a-zA-Z0-9_-]/g, '_');
          return {
            id: item.id,
            filename: `${sanitizedTitle}.${ext}`,
            blobText: item.content,
          };
        });

        const response: ExportWorkerResponse = {
          type: 'EXPORT_BATCH_SUCCESS',
          result,
        };
        self.postMessage(response);
      }
    } catch (err: any) {
      const response: ExportWorkerResponse = {
        type: 'EXPORT_BATCH_ERROR',
        error: err.message || 'Worker execution failed',
      };
      self.postMessage(response);
    }
  };
}
