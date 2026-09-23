import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { JsonStore } from "./json-store.js";

test("serializes concurrent updates without losing writes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "foremint-json-store-"));
  const filePath = path.join(directory, "items.json");

  try {
    const store = new JsonStore<{ id: string; value: number }>(filePath);
    await store.insert({ id: "one", value: 0 });

    await Promise.all(
      Array.from({ length: 20 }, (_, index) => store.update("one", { value: index + 1 })),
    );

    const item = await store.findById("one");
    assert.notEqual(item, null);
    assert.ok(item.value >= 1);
    assert.ok(item.value <= 20);
    assert.equal(JSON.parse(await readFile(filePath, "utf8")).length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("insertIfAbsent returns one existing record for concurrent matching inserts", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "foremint-json-store-"));
  const filePath = path.join(directory, "orders.json");

  try {
    const store = new JsonStore<{ id: string; applicationId: string }>(filePath);
    const [first, second] = await Promise.all([
      store.insertIfAbsent(
        { id: "first", applicationId: "application-1" },
        (existing) => existing.applicationId === "application-1",
      ),
      store.insertIfAbsent(
        { id: "second", applicationId: "application-1" },
        (existing) => existing.applicationId === "application-1",
      ),
    ]);

    assert.equal(first.id, second.id);
    const records = await store.all();
    assert.equal(records.length, 1);
    assert.equal(records[0]?.applicationId, "application-1");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
