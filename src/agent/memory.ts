import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    console.log('[memory] 首次加载  embedding 模型 (约 23MB)...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

async function embed(text: string): Promise<Float32Array> {
  const e = await getEmbedder();
  const output = await e(text, { pooling: 'mean', normalize: true });
  return new Float32Array(output.data);
}

export class Memory {
  private db: Database.Database;

  constructor(path = './memory.db') {
    this.db = new Database(path);
    sqliteVec.load(this.db);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_vec USING vec0(
        embedding float[384]
      );  
    `);
  }

  async save(content: string): Promise<number> {
    const result = this.db.prepare('INSERT INTO memories (content) VALUES (?)').run(content);
    const id = Number(result.lastInsertRowid);
    const vec = await embed(content);
    this.db.prepare('INSERT INTO memory_vec (rowid, embedding) VALUES (?, ?)').run(id, Buffer.from(vec.buffer));
    return id;
  }

  async search(query: string, k = 3) {
    const vec = await embed(query);
    return this.db.prepare(`
      SELECT m.id, m.content, v.distance
      FROM memory_vec v
      JOIN memories m ON m.id = v.rowid
      WHERE v.embedding MATCH ?
      ORDER BY v.distance
      LIMIT ?  
    `).all(Buffer.from(vec.buffer), k) as Array<{ id: number; content: string; distance: number }>;
  }

  close() {
    this.db.close();
  }
}