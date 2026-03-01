import axios from 'axios';

export function getHttpErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    const message = data?.error ?? data?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your connection and try again.';
    }

    const status = error.response?.status;
    if (status === 401) return 'Your session expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return 'Requested resource was not found.';
    if (status && status >= 500) {
      return 'Server error. Please try again shortly.';
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
