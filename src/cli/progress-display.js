import chalk from 'chalk'
import ora from 'ora'
import boxen from 'boxen'

let currentSpinner = null
let progressBars = new Map()

export function displayProgress(progressData) {
  const { type, theme, task, progress, message } = progressData

  switch (type) {
    case 'start':
      showStartMessage(theme)
      break
    
    case 'task':
      updateTaskProgress(theme, task, progress, message)
      break
    
    case 'complete':
      showCompleteMessage(theme)
      break
    
    case 'error':
      showErrorMessage(message)
      break
    
    case 'overall':
      showOverallProgress(progress, message)
      break
  }
}

function showStartMessage(theme) {
  console.log('\n' + chalk.bold('🚀 Creating Your Agentic Teams...\n'))
  
  if (theme) {
    const box = boxen(
      chalk.gray('Starting team generation...'),
      {
        title: `${theme.emoji} ${theme.name} Teams`,
        titleAlignment: 'left',
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    )
    console.log(box)
  }
}

function updateTaskProgress(theme, task, progress, message) {
  const taskKey = `${theme?.name || 'default'}-${task}`
  
  if (!progressBars.has(taskKey)) {
    progressBars.set(taskKey, {
      spinner: ora({
        text: message,
        color: 'cyan'
      }).start()
    })
  }
  
  const taskProgress = progressBars.get(taskKey)
  
  if (progress === 100) {
    taskProgress.spinner.succeed(chalk.green('✅ ' + message))
  } else if (progress === -1) {
    taskProgress.spinner.fail(chalk.red('❌ ' + message))
  } else {
    taskProgress.spinner.text = `${message} ${chalk.gray(`(${progress}%)`)}` 
  }
}

function showCompleteMessage(theme) {
  if (theme) {
    console.log(chalk.green(`\n✅ ${theme.name} teams created successfully!\n`))
  }
}

function showErrorMessage(message) {
  if (currentSpinner) {
    currentSpinner.fail(chalk.red(message))
    currentSpinner = null
  } else {
    console.error(chalk.red('\n❌ Error: ' + message))
  }
}

function showOverallProgress(progress, message) {
  const width = 40
  const filled = Math.round((progress / 100) * width)
  const empty = width - filled
  
  const progressBar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
  const percentage = chalk.bold(`${progress}%`)
  
  const content = [
    `${progressBar} ${percentage} Complete`,
    chalk.cyan(`Current: ${message.current || 'Working...'}`),
    chalk.gray(`Next: ${message.next || 'Almost done...'}`)
  ].join('\n')

  const box = boxen(content, {
    title: 'Progress',
    titleAlignment: 'left',
    padding: 1,
    borderStyle: 'round',
    borderColor: 'green'
  })
  
  // Clear previous line and show new progress
  if (process.stdout.isTTY) {
    process.stdout.cursorTo(0)
    process.stdout.clearLine(1)
  }
  
  console.log(box)
}

export function clearProgress() {
  progressBars.forEach(({ spinner }) => {
    if (spinner && spinner.isSpinning) {
      spinner.stop()
    }
  })
  progressBars.clear()
  
  if (currentSpinner) {
    currentSpinner.stop()
    currentSpinner = null
  }
}