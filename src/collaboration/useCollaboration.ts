import { useState, useEffect, useRef, useCallback } from 'react';
import type { BlockDocument } from '../services/blockDocument';
import { CollaborationManager } from './collaborationManager';
import type {
  CollaborationSessionConfig,
  CollaborationStatus,
  Collaborator,
  ICollaborationProvider,
} from './collaborationTypes';
import { isFeatureEnabled } from '../config/featureFlags';

export interface UseCollaborationReturn {
  isCollabEnabled: boolean;
  status: CollaborationStatus;
  collaborators: Collaborator[];
  updateDocument: (doc: BlockDocument) => void;
}

export function useCollaboration(
  config: CollaborationSessionConfig | null,
  initialDoc: BlockDocument,
  onRemoteDocumentChange?: (doc: BlockDocument) => void,
  customProvider?: ICollaborationProvider
): UseCollaborationReturn {
  const isCollabEnabled = isFeatureEnabled('COLLABORATION');
  const [status, setStatus] = useState<CollaborationStatus>('disconnected');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const managerRef = useRef<CollaborationManager | null>(null);

  useEffect(() => {
    if (!isCollabEnabled || !config || !config.noteId || !config.userId) {
      return;
    }

    const manager = new CollaborationManager();
    managerRef.current = manager;

    const unsubDoc = manager.onDocumentChange((doc) => {
      onRemoteDocumentChange?.(doc);
    });

    const unsubCollab = manager.onCollaboratorsChange((list) => {
      setCollaborators(list);
    });

    const unsubStatus = manager.onStatusChange((s) => {
      setStatus(s);
    });

    void manager.openSession(config, initialDoc, customProvider);

    return () => {
      unsubDoc();
      unsubCollab();
      unsubStatus();
      void manager.closeSession();
      managerRef.current = null;
    };
  }, [isCollabEnabled, config?.noteId, config?.userId]);

  const updateDocument = useCallback((doc: BlockDocument) => {
    if (isCollabEnabled && managerRef.current) {
      managerRef.current.updateLocalDocument(doc);
    }
  }, [isCollabEnabled]);

  return {
    isCollabEnabled,
    status,
    collaborators,
    updateDocument,
  };
}
