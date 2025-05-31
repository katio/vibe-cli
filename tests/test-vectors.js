import { VibeDatabase } from './src/services/database.js';
import * as sqliteVec from 'sqlite-vec';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'test-vectors.db');

// Simple test data
const testVectors = [
  [0.1, 0.2, 0.3, 0.4],
  [0.4, 0.3, 0.2, 0.1],
  [0.9, 0.8, 0.7, 0.6],
  [0.6, 0.7, 0.8, 0.9]
];

async function testVectorOperations() {
  try {
    // Initialize database
    const db = new VibeDatabase(dbPath);
    await db.initialize();
    
    console.log('\n=== Testing Vector Operations ===');
    
    // Insert test vectors
    console.log('\nInserting test vectors...');
    for (let i = 0; i < testVectors.length; i++) {
      const vector = testVectors[i];
      const docId = await db.insertDocument({
        content: `Document ${i + 1}`,
        filePath: `test-${i + 1}.txt`,
        metadata: JSON.stringify({ source: 'test' })
      });
      
      await db.insertEmbedding(
        docId,
        new Float32Array(vector),
        `test-${i + 1}.txt`,
        `Test chunk ${i + 1}`
      );
      console.log(`Inserted vector ${i + 1} with ID ${docId}`);
    }
    
    // Perform similarity search
    console.log('\nPerforming similarity search...');
    const queryVector = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const results = await db.similaritySearch(queryVector, 2);
    
    console.log('\nTop 2 most similar vectors:');
    results.forEach((result, i) => {
      console.log(`#${i + 1}: Document ID ${result.document_id} (Distance: ${result.distance})`);
    });
    
    // Get all documents
    console.log('\nAll documents in database:');
    const docs = await db.getAllDocuments();
    console.log(docs);
    
    // Clean up
    await db.close();
    await fs.promises.unlink(dbPath);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testVectorOperations();
