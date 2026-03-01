type FirestoreTimestampLike =
  | { _seconds: number; _nanoseconds?: number }
  | { seconds: number; nanoseconds?: number }
  | { toDate?: () => Date };

export const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'object') {
    const obj = value as FirestoreTimestampLike;
    const anyObj = obj as any;

    if (typeof anyObj.toDate === 'function') {
      const d = anyObj.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }

    if (typeof anyObj._seconds === 'number') {
      const d = new Date(anyObj._seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    if (typeof anyObj.seconds === 'number') {
      const d = new Date(anyObj.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateSafe = (value: unknown, fallback = 'N/A'): string => {
  const date = toDateSafe(value);
  return date ? date.toLocaleDateString() : fallback;
};

export const formatDateTimeSafe = (value: unknown, fallback = 'N/A'): string => {
  const date = toDateSafe(value);
  return date ? date.toLocaleString() : fallback;
};
