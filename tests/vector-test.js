import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'vector-test.db');

// Remove existing test DB if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

// Create a new database
const db = new Database(dbPath);

// Load sqlite-vec extension
try {
  sqliteVec.load(db);
  console.log('✅ Successfully loaded sqlite-vec extension');
} catch (error) {
  console.error('❌ Failed to load sqlite-vec extension:', error);
  process.exit(1);
}

// Create tables
try {

  
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_examples USING vec0(
      sample_embedding FLOAT[4]  -- Using 4D vectors for this test
    );
    
    -- Create a separate table to store document metadata
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      file_path TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✅ Successfully created database tables');
} catch (error) {
  console.error('❌ Failed to create database tables:', error);
  process.exit(1);
}

// Test data with 4D vectors
const testData = [
  { content: 'First document', vector: [0.1, 0.2, 0.3, 0.4] },
  { content: 'Second document', vector: [0.4, 0.3, 0.2, 0.1] },
  { content: 'Third document', vector: [0.9, 0.8, 0.7, 0.6] },
  { content: 'Fourth document', vector: [0.6, 0.7, 0.8, 0.9] }
];

try {
  // Insert test data into both tables
  for (const [index, item] of testData.entries()) {
    // Insert document metadata
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO documents (content, file_path, metadata) VALUES (?, ?, ?)'
    ).run(
      item.content,
      `test-${index + 1}.txt`,
      JSON.stringify({ source: 'test' })
    );
    
    // Insert vector embedding as JSON array string
    const vectorStr = JSON.stringify(item.vector);
    db.exec(`
      INSERT INTO vec_examples (rowid, sample_embedding)
      VALUES (${lastInsertRowid}, '${vectorStr}')
    `);
    
    console.log(`✅ Inserted document: ${item.content} (ID: ${lastInsertRowid})`);
  }
} catch (error) {
  console.error('❌ Failed to insert test data:', error);
  process.exit(1);
}

// Perform similarity search
try {
  console.log('\n🔍 Running similarity search...');
  const queryVector = [0.1, 0.2, 0.3, 0.4];
  const queryVectorStr = JSON.stringify(queryVector);
  
  console.log('\n🔎 Top 3 most similar documents to', queryVector, ':');
  
  // KNN style query
  const results = db.prepare(`
    SELECT 
      rowid,
      distance
    FROM vec_examples
    WHERE sample_embedding MATCH '${queryVectorStr}'
    ORDER BY distance
    LIMIT 3
  `).all();
  
  // Display results with document content
  results.forEach((row, i) => {
    const doc = db.prepare('SELECT content FROM documents WHERE id = ?').get(row.rowid);
    console.log(`#${i + 1}: "${doc.content}" (Distance: ${row.distance.toFixed(4)})`);
  });
  
  // Show all documents with their vectors
  console.log('\n📚 All documents with vectors:');
  const allData = db.prepare(`
    SELECT d.id, d.content, v.sample_embedding
    FROM documents d
    JOIN vec_examples v ON d.id = v.rowid
  `).all();
  
  allData.forEach(row => {
    console.log(`- ID: ${row.id}, Content: "${row.content}"`);
    console.log(`  Vector: ${row.sample_embedding}`);
  });
  
} catch (error) {
  console.error('❌ Search failed:', error);
  process.exit(1);
} finally {
  // Clean up
  db.close();
  // Uncomment to delete test database after running
  // fs.unlinkSync(dbPath);
}

console.log('\n✨ Test completed successfully!');
