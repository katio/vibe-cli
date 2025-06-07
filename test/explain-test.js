import { processQuery } from '../src/services/llm/index.js';

async function testExplain() {
  try {
    console.log('Testing explain command...');
    
    const query = 'Explain the structure of this repository';
    const context = {
      currentFolder: process.cwd(),
      loadedFolders: [{
        id: 1,
        path: process.cwd(),
        fileCount: 10
      }]
    };

    console.log('\nSending query:', query);
    const response = await processQuery(query, context);
    
    console.log('\nResponse:');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testExplain();
