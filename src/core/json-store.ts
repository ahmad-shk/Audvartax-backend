import { promises as fs } from "node:fs";
import path from "node:path";

const storeLocks = new Map<string, Promise<void>>();

export class JsonStore<T extends { id: string }> {
  constructor(private readonly filePath: string) {}

  private async read(): Promise<T[]> {
    try {
      return JSON.parse(await fs.readFile(this.filePath, "utf8")) as T[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await this.write([]);
      return [];
    }
  }

  private async write(items: T[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, JSON.stringify(items, null, 2));
      await fs.rename(temporaryPath, this.filePath);
    } finally {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }

  private async withLock<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    const previous = storeLocks.get(this.filePath) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    storeLocks.set(this.filePath, current);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (storeLocks.get(this.filePath) === current) storeLocks.delete(this.filePath);
    }
  }

  async all(): Promise<T[]> {
    return this.withLock(() => this.read());
  }

  async findById(id: string): Promise<T | null> {
    return this.withLock(async () => (await this.read()).find((item) => item.id === id) ?? null);
  }

  async insert(item: T): Promise<T> {
    return this.withLock(async () => {
      const items = await this.read();
      items.push(item);
      await this.write(items);
      return item;
    });
  }

  async insertIfAbsent(item: T, predicate: (existing: T) => boolean): Promise<T> {
    return this.withLock(async () => {
      const items = await this.read();
      const existing = items.find(predicate);
      if (existing) return existing;

      items.push(item);
      await this.write(items);
      return item;
    });
  }

  async update(id: string, changes: Partial<T>): Promise<T | null> {
    return this.withLock(async () => {
      const items = await this.read();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;

      items[index] = { ...items[index], ...changes };
      await this.write(items);
      return items[index];
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withLock(async () => {
      const items = await this.read();
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) return false;
      await this.write(filtered);
      return true;
    });
  }
}
