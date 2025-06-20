import chalk from 'chalk'
import boxen from 'boxen'

let lastProgressBox = null

export function displayProgress(progressData) {
  const { type, theme, task, progress, message } = progressData

  switch (type) {
    case 'start':
      showStartMessage(theme)
      break
    
    case 'task':
      showTaskProgress(theme, task, progress, message)
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

function showTaskProgress(theme, task, progress, message) {
  const icon = getTaskIcon(task, progress)
  const color = getTaskColor(progress)
  
  // Format the message with indentation and progress
  const formattedMessage = `  ${icon} ${message}`
  
  if (progress === 100) {
    console.log(chalk[color](formattedMessage))
  } else if (progress === -1) {
    console.log(chalk.red(formattedMessage))
  } else {
    // Show progress percentage for ongoing tasks
    console.log(chalk[color](`${formattedMessage} ${chalk.gray(`[${progress}%]`)}`) )
  }
}

function getTaskIcon(task, progress) {
  if (progress === 100) return '✅'
  if (progress === -1) return '❌'
  
  switch (task) {
    case 'folders': return '📁'
    case 'clone': return '🔄'
    case 'config': return '⚙️'
    case 'git': return '🔧'
    case 'final': return '🎉'
    default: return '▶️'
  }
}

function getTaskColor(progress) {
  if (progress === 100) return 'green'
  if (progress === -1) return 'red'
  if (progress >= 80) return 'yellow'
  return 'cyan'
}

function showCompleteMessage(theme) {
  if (theme) {
    console.log(chalk.green(`\n✅ ${theme.name} teams created successfully!\n`))
  }
}

function showErrorMessage(message) {
  console.error(chalk.red('\n❌ Error: ' + message))
}

function showOverallProgress(progress, message) {
  const width = 40
  const filled = Math.round((progress / 100) * width)
  const empty = width - filled
  
  const progressBar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
  const percentage = chalk.bold(`${progress}%`)
  
  // Show overall progress in a compact way
  console.log(chalk.dim('\n' + '─'.repeat(60)))
  console.log(chalk.bold('Overall Progress:'), progressBar, percentage)
  console.log(chalk.cyan('Current:'), message.current || 'Working...')
  if (message.next && progress < 100) {
    console.log(chalk.gray('Next:'), message.next)
  }
  console.log(chalk.dim('─'.repeat(60) + '\n'))
}

export function clearProgress() {
  // No spinners to clear anymore
  lastProgressBox = null
}