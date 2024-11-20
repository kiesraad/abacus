export function callAsync<T extends unknown[], U>(asyncFn: (...args: T) => Promise<U>, ...args: T): void {
  void (async (...args: T) => {
    await asyncFn(...args);
  })(...args);
}
