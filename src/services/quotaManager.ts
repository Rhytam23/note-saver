export interface StorageEstimateResult {
  quotaBytes: number;
  usageBytes: number;
  percentUsed: number;
  remainingBytes: number;
  isWarningThreshold: boolean;
  isCriticalThreshold: boolean;
}

export class QuotaManager {
  static WARNING_THRESHOLD_PERCENT = 80;
  static CRITICAL_THRESHOLD_PERCENT = 95;

  /**
   * Estimates current browser storage usage and quota.
   */
  static async getStorageEstimate(): Promise<StorageEstimateResult> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 1024 * 1024 * 1024; // 1 GB fallback
      const usage = estimate.usage || 0;
      const percentUsed = (usage / quota) * 100;
      const remainingBytes = Math.max(0, quota - usage);

      return {
        quotaBytes: quota,
        usageBytes: usage,
        percentUsed: Math.round(percentUsed * 100) / 100,
        remainingBytes,
        isWarningThreshold: percentUsed >= this.WARNING_THRESHOLD_PERCENT,
        isCriticalThreshold: percentUsed >= this.CRITICAL_THRESHOLD_PERCENT,
      };
    }

    // Fallback if storage API is unavailable
    return {
      quotaBytes: 1024 * 1024 * 1024,
      usageBytes: 0,
      percentUsed: 0,
      remainingBytes: 1024 * 1024 * 1024,
      isWarningThreshold: false,
      isCriticalThreshold: false,
    };
  }

  /**
   * Evaluates whether a target byte size can safely be written.
   */
  static async canSafelyWrite(requiredBytes: number): Promise<{ safe: boolean; reason?: string }> {
    const estimate = await this.getStorageEstimate();
    if (estimate.remainingBytes < requiredBytes * 2.5) {
      return {
        safe: false,
        reason: `Insufficient storage space. Required: ${requiredBytes} bytes, Available free: ${estimate.remainingBytes} bytes.`,
      };
    }
    return { safe: true };
  }
}
