#!/usr/bin/env node
/**
 * Test the enhanced workflow
 */

import { runCLI } from './src/cli/index.js'

// Simulate CLI arguments for enhanced mode
process.argv = ['node', 'test-enhanced.js', '--enhanced', '--dry-run']

runCLI(process.argv)