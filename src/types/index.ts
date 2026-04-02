export interface CacheOptions {
  ttl?: number;
  key?: string;
}

export interface WrapOptions extends CacheOptions {
  serialize?: boolean;
}

export interface ProviderOptions {
  maxSize?: number;
  ttl?: number;
}

export interface CacheProvider {
  get<T = any>(key: string): Promise<T | undefined>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
}

export interface SerializableValue {
  data: any;
  timestamp: number;
  ttl?: number;
}
