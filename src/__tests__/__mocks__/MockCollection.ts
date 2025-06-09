export class MockCollection<K, V> extends Map<K, V> {
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    super(entries || []);
  }

  get size(): number {
    return super.size;
  }

  find(predicate: (value: V) => boolean): V | undefined {
    for (const [, value] of this) {
      if (predicate(value)) return value;
    }
    return undefined;
  }

  values(): IterableIterator<V> {
    return super.values();
  }
} 