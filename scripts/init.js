#!/usr/bin/env node

/**
 * Project Initialization Script
 * Run this script on first clone to set up the development environment
 * 
 * Usage:
 *   npm run init
 *   or
 *   node scripts/init.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');

console.log('🚀 Initializing University IP Management System Project...\n');

// Check for .env.local
console.log('📋 Checking environment configuration...');
const envLocalPath = path.join(projectRoot, '.env.local');
const envExamplePath = path.join(projectRoot, '.env.example');

if (!fs.existsSync(envLocalPath)) {
  console.log('⚠️  .env.local not found');
  console.log('   Create .env.local with your Supabase credentials:');
  console.log(`   cp .env.example .env.local`);
  console.log('   Then edit .env.local and add your values\n');
} else {
  console.log('✓ .env.local exists');
}

// Suggest environment variables
console.log('\n📝 Required environment variables:');
console.log('   VITE_SUPABASE_URL=https://your-project.supabase.co');
console.log('   VITE_SUPABASE_ANON_KEY=your-anon-key-here\n');

console.log('📚 Documentation to read:');
console.log('   1. QUICK_REFERENCE.md - Fast lookup');
console.log('   2. SETUP.md - Detailed setup guide');
console.log('   3. BOLT_ENVIRONMENT.md - Bolt.new configuration');
console.log('   4. PROJECT_STRUCTURE.md - Project architecture\n');

console.log('🏁 Next steps:');
console.log('   1. npm install              # Install dependencies');
console.log('   2. cp .env.example .env.local');
console.log('   3. Edit .env.local with Supabase credentials');
console.log('   4. npm run dev              # Start development server\n');

console.log('✨ Project initialized! Happy coding! 🎉\n');
