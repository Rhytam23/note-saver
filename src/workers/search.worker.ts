import { localSearchService, SearchOptions } from '../services/localSearchService';
import { SearchDocument, SearchDocumentId } from '../types/search';

export interface WorkerMessage {
  type: 'INDEX_DOCS' | 'REMOVE_DOC' | 'REMOVE_NOTE' | 'MARK_DELETED' | 'SEARCH' | 'CLEAR_ALL';
  id?: string;
  payload?: any;
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const { type, id, payload } = event.data || {};

    try {
      switch (type) {
        case 'INDEX_DOCS': {
          const docs: SearchDocument[] = payload?.documents || [];
          await localSearchService.saveDocuments(docs);
          if (id) {
            self.postMessage({ type: 'INDEX_DOCS_SUCCESS', id });
          }
          break;
        }

        case 'REMOVE_DOC': {
          const docId: SearchDocumentId = payload?.documentId;
          if (docId) {
            await localSearchService.removeDocument(docId);
          }
          if (id) {
            self.postMessage({ type: 'REMOVE_DOC_SUCCESS', id });
          }
          break;
        }

        case 'REMOVE_NOTE': {
          const noteId: string = payload?.noteId;
          if (noteId) {
            await localSearchService.removeNote(noteId);
          }
          if (id) {
            self.postMessage({ type: 'REMOVE_NOTE_SUCCESS', id });
          }
          break;
        }

        case 'MARK_DELETED': {
          const { noteId, isDeleted } = payload || {};
          if (noteId) {
            await localSearchService.markNoteDeleted(noteId, !!isDeleted);
          }
          if (id) {
            self.postMessage({ type: 'MARK_DELETED_SUCCESS', id });
          }
          break;
        }

        case 'SEARCH': {
          const { query, options } = (payload || {}) as { query: string; options?: SearchOptions };
          const results = await localSearchService.search(query || '', options);
          if (id) {
            self.postMessage({ type: 'SEARCH_RESPONSE', id, payload: { results } });
          }
          break;
        }

        case 'CLEAR_ALL': {
          await localSearchService.clearAll();
          if (id) {
            self.postMessage({ type: 'CLEAR_ALL_SUCCESS', id });
          }
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      if (id) {
        self.postMessage({ type: 'ERROR', id, payload: { error: err?.message || 'Worker error' } });
      }
    }
  });
}
