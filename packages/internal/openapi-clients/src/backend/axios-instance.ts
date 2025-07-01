/* eslint-disable */
/**
 * Axios retry configuration and setup
 */

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: any) => boolean;
  onRetry?: (retryCount: number, error: any, requestConfig: any) => void;
}