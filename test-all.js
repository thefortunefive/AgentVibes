#!/usr/bin/env node

import { spawn } from 'child_process'
import chalk from 'chalk'
import ora from 'ora'

console.log(chalk.bold.cyan('\n🧪 Running Agentic Team Generator Test Suite\n'))

const testSuites = [
  { name: 'Unit Tests - Themes', file: 'tests/themes.test.js' },
  { name: 'Unit Tests - Generators', file: 'tests/generators.test.js' },
  { name: 'Unit Tests - CLI', file: 'tests/cli.test.js' },
  { name: 'Integration Tests', file: 'tests/integration.test.js' },
  { name: 'End-to-End Tests', file: 'tests/e2e.test.js' }
]

let totalTests = 0
let passedTests = 0
let failedTests = 0
const results = []

async function runTest(suite) {
  const spinner = ora(`Running ${suite.name}...`).start()
  
  return new Promise((resolve) => {
    const startTime = Date.now()
    let output = ''
    let errorOutput = ''
    
    const child = spawn('node', ['--test', suite.file], {
      env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
    })
    
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime
      
      // Parse TAP output for test counts
      const passMatch = output.match(/# pass (\d+)/)
      const failMatch = output.match(/# fail (\d+)/)
      const testsMatch = output.match(/# tests (\d+)/)
      
      const passed = passMatch ? parseInt(passMatch[1]) : 0
      const failed = failMatch ? parseInt(failMatch[1]) : 0
      const total = testsMatch ? parseInt(testsMatch[1]) : 0
      
      totalTests += total
      passedTests += passed
      failedTests += failed
      
      if (code === 0 && failed === 0) {
        spinner.succeed(chalk.green(`✓ ${suite.name} (${total} tests, ${duration}ms)`))
        results.push({ suite: suite.name, status: 'passed', tests: total, duration })
      } else {
        spinner.fail(chalk.red(`✗ ${suite.name} (${failed}/${total} failed, ${duration}ms)`))
        results.push({ 
          suite: suite.name, 
          status: 'failed', 
          tests: total, 
          failed, 
          duration,
          output: output + errorOutput 
        })
      }
      
      resolve()
    })
  })
}

async function runAllTests() {
  const startTime = Date.now()
  
  // Run tests sequentially to avoid conflicts
  for (const suite of testSuites) {
    await runTest(suite)
  }
  
  const totalDuration = Date.now() - startTime
  
  // Print summary
  console.log('\n' + chalk.bold('📊 Test Summary'))
  console.log('─'.repeat(50))
  
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌'
    const color = result.status === 'passed' ? chalk.green : chalk.red
    console.log(`${icon} ${color(result.suite.padEnd(25))} ${result.tests} tests (${result.duration}ms)`)
  })
  
  console.log('─'.repeat(50))
  console.log(chalk.bold(`Total: ${totalTests} tests`))
  console.log(chalk.green(`Passed: ${passedTests}`))
  console.log(chalk.red(`Failed: ${failedTests}`))
  console.log(chalk.gray(`Duration: ${(totalDuration / 1000).toFixed(2)}s`))
  
  // Show failed test details
  const failedSuites = results.filter(r => r.status === 'failed')
  if (failedSuites.length > 0) {
    console.log('\n' + chalk.red.bold('❌ Failed Tests Details:'))
    failedSuites.forEach(suite => {
      console.log(chalk.red(`\n${suite.suite}:`))
      // Extract failure details from TAP output
      const failureLines = suite.output.split('\n')
        .filter(line => line.includes('not ok') || line.includes('error:'))
        .slice(0, 5) // Show first 5 errors
      failureLines.forEach(line => console.log(chalk.gray('  ' + line.trim())))
    })
  }
  
  // Exit with appropriate code
  if (failedTests > 0) {
    console.log('\n' + chalk.red.bold('❌ Test suite failed!'))
    process.exit(1)
  } else {
    console.log('\n' + chalk.green.bold('✅ All tests passed!'))
    process.exit(0)
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Unhandled error:'), error)
  process.exit(1)
})

// Run tests
runAllTests().catch(error => {
  console.error(chalk.red('\n❌ Test runner error:'), error)
  process.exit(1)
})