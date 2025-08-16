#!/usr/bin/env node

// Railway Deployment Debug Script
console.log('🔍 Railway Deployment Debug Information:');
console.log('=====================================');

// Current working directory
console.log('📁 Current working directory:', process.cwd());

// List files in current directory
const fs = require('fs');
const path = require('path');

try {
  const files = fs.readdirSync(process.cwd());
  console.log('📋 Files in current directory:');
  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const stats = fs.statSync(filePath);
    console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
  });
} catch (error) {
  console.error('❌ Error reading directory:', error.message);
}

// Check for server.js specifically
const serverJsPath = path.join(process.cwd(), 'server.js');
console.log('🔍 Looking for server.js at:', serverJsPath);

if (fs.existsSync(serverJsPath)) {
  console.log('✅ server.js found! Starting application...');
  console.log('=====================================');
  
  // Start the actual server
  require('./server.js');
} else {
  console.log('❌ server.js NOT found!');
  console.log('🔍 Searching for server.js in subdirectories...');
  
  // Search for server.js in subdirectories
  function findServerJs(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory() && file !== 'node_modules') {
        const found = findServerJs(filePath);
        if (found) return found;
      } else if (file === 'server.js') {
        return filePath;
      }
    }
    return null;
  }
  
  const foundServerJs = findServerJs(process.cwd());
  if (foundServerJs) {
    console.log('✅ Found server.js at:', foundServerJs);
    console.log('🔄 Changing directory and starting...');
    process.chdir(path.dirname(foundServerJs));
    require(foundServerJs);
  } else {
    console.log('❌ server.js not found anywhere!');
    console.log('🚨 Deployment failed - server.js missing');
    process.exit(1);
  }
}
