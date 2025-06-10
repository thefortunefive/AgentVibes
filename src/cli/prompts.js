import chalk from 'chalk'
import figlet from 'figlet'
import boxen from 'boxen'

export async function showWelcomeScreen() {
  console.clear()
  
  // Smaller, simpler title
  const title = figlet.textSync('AgentVibes', {
    font: 'Standard',
    horizontalLayout: 'fitted'
  })

  // Compact welcome box
  const welcomeBox = boxen(
    chalk.cyan(title) + '\n' +
    chalk.yellow('Create themed AI coding teams') + '\n\n' +
    chalk.gray('by Paul Preibisch (@paulpreibisch)') + '\n' +
    chalk.blue('github.com/paulpreibisch/AgentVibes'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      textAlignment: 'center'
    }
  )

  console.log(welcomeBox)
  console.log()
  
  // Small pause for effect
  await new Promise(resolve => setTimeout(resolve, 500))
}

export function showSetupTypePrompt() {
  console.log('\n' + chalk.yellow('ℹ️  Themed setups include character personalities, catchphrases,'))
  console.log(chalk.yellow('    and unique communication styles for more engaging collaboration.\n'))
}