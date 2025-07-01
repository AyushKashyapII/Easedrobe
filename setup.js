#!/usr/bin/env node

/**
 * Setup script for StyleAI
 * This script checks for necessary prerequisites and helps with installation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m%s\x1b[0m', '🎨 Easedrobe - Setup Helper');
console.log('---------------------------');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion < 18) {
  console.log('\x1b[31m%s\x1b[0m', '❌ Error: Node.js version 18 or higher is required.');
  console.log(`Current version: ${nodeVersion}`);
  console.log('Please upgrade Node.js and try again.');
  process.exit(1);
} else {
  console.log('\x1b[32m%s\x1b[0m', '✅ Node.js version check passed');
}

// Check if .env file exists, create if not
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('\n📝 Creating .env file from example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('\x1b[32m%s\x1b[0m', '✅ .env file created');
  console.log('\x1b[33m%s\x1b[0m', '⚠️  Please edit the .env file to add your OpenAI API key');
}

console.log('\n📦 Checking for dependencies...');

function installDependencies() {
  try {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('\x1b[32m%s\x1b[0m', '✅ Dependencies installed successfully');
  } catch (error) {
    console.log('\x1b[31m%s\x1b[0m', '❌ Error installing dependencies');
    console.error(error);
    process.exit(1);
  }
}

function askApiKey() {
  rl.question('\nDo you want to add your OpenAI API key now? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      rl.question('Enter your OpenAI API key: ', (apiKey) => {
        try {
          let envContent = fs.readFileSync(envPath, 'utf-8');
          envContent = envContent.replace('OPENAI_API_KEY=your_api_key_here', `OPENAI_API_KEY=${apiKey}`);
          fs.writeFileSync(envPath, envContent);
          console.log('\x1b[32m%s\x1b[0m', '✅ API key saved to .env file');
          finishSetup();
        } catch (error) {
          console.log('\x1b[31m%s\x1b[0m', '❌ Error saving API key');
          finishSetup();
        }
      });
    } else {
      console.log('\x1b[33m%s\x1b[0m', '⚠️  Remember to add your API key to the .env file before running the app');
      finishSetup();
    }
  });
}

function finishSetup() {
  console.log('\n🚀 Setup completed!');
  console.log('\nTo start the app, run:');
  console.log('\x1b[36m%s\x1b[0m', 'npm run dev');
  rl.close();
}

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('node_modules not found. Need to install dependencies.');
  installDependencies();
  askApiKey();
} else {
  console.log('\x1b[32m%s\x1b[0m', '✅ Dependencies already installed');
  askApiKey();
}