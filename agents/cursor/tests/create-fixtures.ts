import { Database } from "bun:sqlite";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create session 1 - with messages
const db1 = new Database(
  path.join(__dirname, "fixtures/chats/workspace-1/session-1/store.db"),
);
db1.exec(`
  CREATE TABLE blobs (id TEXT PRIMARY KEY, data BLOB);
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`);
db1
  .query("INSERT INTO meta (key, value) VALUES (?, ?)")
  .run("0", "session-1-meta");
db1
  .query("INSERT INTO blobs (id, data) VALUES (?, ?)")
  .run("blob1", Buffer.from("message 1"));
db1
  .query("INSERT INTO blobs (id, data) VALUES (?, ?)")
  .run("blob2", Buffer.from("message 2"));
db1
  .query("INSERT INTO blobs (id, data) VALUES (?, ?)")
  .run("blob3", Buffer.from("message 3"));
db1.close();
console.log("Created session 1");

// Create session 2 - with more messages
const db2 = new Database(
  path.join(__dirname, "fixtures/chats/workspace-1/session-2/store.db"),
);
db2.exec(`
  CREATE TABLE blobs (id TEXT PRIMARY KEY, data BLOB);
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`);
db2
  .query("INSERT INTO meta (key, value) VALUES (?, ?)")
  .run("0", "session-2-meta");
db2
  .query("INSERT INTO blobs (id, data) VALUES (?, ?)")
  .run("blob1", Buffer.from("message 1"));
db2
  .query("INSERT INTO blobs (id, data) VALUES (?, ?)")
  .run("blob2", Buffer.from("message 2"));
db2.close();
console.log("Created session 2");

// Create session 3 - empty session
const db3 = new Database(
  path.join(__dirname, "fixtures/chats/workspace-2/session-3/store.db"),
);
db3.exec(`
  CREATE TABLE blobs (id TEXT PRIMARY KEY, data BLOB);
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`);
db3
  .query("INSERT INTO meta (key, value) VALUES (?, ?)")
  .run("0", "session-3-meta");
db3.close();
console.log("Created session 3");

console.log("All fixtures created successfully!");
