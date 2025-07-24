#!/usr/bin/env node

/**
 * Package validation script
 * Tests all the main exports and functionality
 */

const pkg = require('../package.json');

console.log(`📦 Testing package: ${pkg.name}@${pkg.version}\n`);

// Test ES module exports
try {
    const {
        ExecutionManager,
        MidsceneExecutionServer,
        MidsceneExecutionClient,
        createServer,
        createExecutionManager
    } = require('../dist/lib/index.js');

    console.log('✅ Main exports available:');
    console.log('   - ExecutionManager:', typeof ExecutionManager);
    console.log('   - MidsceneExecutionServer:', typeof MidsceneExecutionServer);
    console.log('   - MidsceneExecutionClient:', typeof MidsceneExecutionClient);
    console.log('   - createServer:', typeof createServer);
    console.log('   - createExecutionManager:', typeof createExecutionManager);

    // Test server export
    const { MidsceneExecutionServer: ServerExport } = require('../dist/lib/server.js');
    console.log('   - Server export:', typeof ServerExport);

} catch (error) {
    console.error('❌ Import error:', error.message);
    process.exit(1);
}

// Test CLI binary
const fs = require('fs');
const path = require('path');

try {
    const cliPath = path.join(__dirname, '../bin/server.js');
    const exists = fs.existsSync(cliPath);
    console.log('✅ CLI binary exists:', exists);

    if (exists) {
        const content = fs.readFileSync(cliPath, 'utf8');
        const hasShebang = content.startsWith('#!/usr/bin/env node');
        console.log('   - Has proper shebang:', hasShebang);
    }
} catch (error) {
    console.error('❌ CLI check error:', error.message);
}

// Test TypeScript declarations
try {
    const typeDefsPath = path.join(__dirname, '../dist/types/index.d.ts');
    const exists = fs.existsSync(typeDefsPath);
    console.log('✅ TypeScript declarations exist:', exists);
} catch (error) {
    console.error('❌ Type definitions check error:', error.message);
}

console.log('\n🎯 Package validation complete!');
console.log('\n📄 Package Information:');
console.log(`   Name: ${pkg.name}`);
console.log(`   Version: ${pkg.version}`);
console.log(`   Description: ${pkg.description}`);
console.log(`   Main: ${pkg.main}`);
console.log(`   Types: ${pkg.types}`);
console.log(`   CLI: ${pkg.bin['midscene-server']}`);

console.log('\n🚀 Ready for use! Examples:');
console.log('   # Install and use in project');
console.log('   npm install @midscene/execution-server');
console.log('   ');
console.log('   # Start server from CLI');
console.log('   npx midscene-server --port 3001');
console.log('   ');
console.log('   # Use in code');
console.log('   const { createServer } = require("@midscene/execution-server");');
console.log('   const server = await createServer({ port: 3001 });');
