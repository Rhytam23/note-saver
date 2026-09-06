import { v4 as uuidv4 } from 'uuid';
import type { Block } from '../types/block';
import type { Attachment } from '../types/attachment';

export interface TranscriptionSegment {
  startTimeSec: number;
  endTimeSec: number;
  text: string;
  speakerId?: string;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  language?: string;
}

export interface ITranscriptionProvider {
  id: string;
  name: string;
  transcribe(audioBlob: Blob | ArrayBuffer, options?: Record<string, any>): Promise<TranscriptionResult>;
}

export class MockTranscriptionProvider implements ITranscriptionProvider {
  public id = 'mock-transcription-provider';
  public name = 'Mock Offline Transcription Provider';

  public async transcribe(_audioBlob: Blob | ArrayBuffer): Promise<TranscriptionResult> {
    return {
      fullText: 'Hello, welcome to NoteNirman 2.0 collaborative voice notes.',
      language: 'en',
      segments: [
        { startTimeSec: 0, endTimeSec: 4, text: 'Hello, welcome to NoteNirman 2.0', speakerId: 'Speaker 1' },
        { startTimeSec: 5, endTimeSec: 9, text: 'collaborative voice notes.', speakerId: 'Speaker 1' },
      ],
    };
  }
}

/**
 * Generate derived Blocks from audio transcription results
 */
export function createAudioBlocksFromTranscription(
  attachment: Attachment,
  transcription: TranscriptionResult
): { audioBlock: Block; derivedBlocks: Block[] } {
  const now = new Date().toISOString();
  const audioBlockId = uuidv4();

  const audioBlock: Block = {
    id: audioBlockId,
    noteId: attachment.noteId,
    parentId: null,
    type: 'audio',
    content: attachment.remoteUrl || attachment.localUri || '',
    properties: {
      attachmentId: attachment.id,
      url: attachment.remoteUrl || attachment.localUri || '',
      caption: attachment.filename,
      durationSec: attachment.metadata?.durationSec || 0,
      waveform: attachment.metadata?.waveform || [],
      fileSizeBytes: attachment.sizeBytes,
      mimeType: attachment.mimeType,
    },
    position: 0,
    createdAt: now,
    updatedAt: now,
  };

  const derivedBlocks: Block[] = transcription.segments.map((seg, idx) => ({
    id: uuidv4(),
    noteId: attachment.noteId,
    parentId: audioBlockId,
    type: 'paragraph',
    content: `[${formatTime(seg.startTimeSec)}] ${seg.text}`,
    properties: {
      attachmentId: attachment.id,
      startTimeSec: seg.startTimeSec,
      endTimeSec: seg.endTimeSec,
      speakerId: seg.speakerId,
    },
    position: idx + 1,
    createdAt: now,
    updatedAt: now,
  }));

  return { audioBlock, derivedBlocks };
}

function formatTime(sec: number): string {
  const mins = Math.floor(sec / 60);
  const remainder = Math.floor(sec % 60);
  return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}
