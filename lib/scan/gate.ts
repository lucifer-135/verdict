/** Lets one async action run at a time; calls made while it runs are ignored (e.g. a double tap). */
export interface Gate {
  readonly busy: boolean;
  run<T>(fn: () => Promise<T> | T): Promise<T | undefined>;
}

export function createGate(): Gate {
  let busy = false;
  return {
    get busy() {
      return busy;
    },
    run(fn) {
      if (busy) return Promise.resolve(undefined);
      busy = true;
      try {
        return Promise.resolve(fn()).finally(() => {
          busy = false;
        });
      } catch (e) {
        busy = false;
        return Promise.reject(e);
      }
    },
  };
}
