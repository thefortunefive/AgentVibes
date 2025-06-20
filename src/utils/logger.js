import chalk from 'chalk'

class Logger {
  constructor() {
    this.verbose = false
  }
  
  setVerbose(verbose) {
    this.verbose = verbose
  }
  
  info(message, ...args) {
    console.log(chalk.blue('ℹ'), message, ...args)
  }
  
  success(message, ...args) {
    console.log(chalk.green('✓'), message, ...args)
  }
  
  warn(message, ...args) {
    console.log(chalk.yellow('⚠'), message, ...args)
  }
  
  error(message, ...args) {
    console.error(chalk.red('✖'), message, ...args)
  }
  
  debug(message, ...args) {
    if (this.verbose) {
      console.log(chalk.gray('●'), message, ...args)
    }
  }
  
  log(message, ...args) {
    console.log(message, ...args)
  }
}

export const logger = new Logger()