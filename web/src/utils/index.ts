/**
 * Debounce wrapper.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let args: Parameters<T> | null = null;
  let context: ThisParameterType<T> | null = null;
  let timestamp = 0;
  let result: ReturnType<T> | undefined;

  const later = () => {
    const last = +new Date() - timestamp;

    if (last < wait && last > 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;

      if (!immediate && context !== null && args !== null) {
        result = func.apply(context, args);
        context = null;
        args = null;
      }
    }
  };

  return function (this: ThisParameterType<T>, ...newArgs: Parameters<T>) {
    context = this;
    args = newArgs;
    timestamp = +new Date();
    const callNow = immediate && !timeout;

    if (!timeout) {
      timeout = setTimeout(later, wait);
    }

    if (callNow && context !== null && args !== null) {
      result = func.apply(context, args);
      context = null;
      args = null;
    }

    return result;
  };
}

/**
 * 10000 => "10,000"
 * @param {number} num
 */
export function toThousandFilter(num:number) {
  return (+num || 0).toString().replace(/^-?\d+/g, m => m.replace(/(?=(?!\b)(\d{3})+$)/g, ','))
}