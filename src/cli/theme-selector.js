import chalk from 'chalk'
import inquirer from 'inquirer'
import boxen from 'boxen'

export async function selectThemes(availableThemes) {
  console.log('\n' + chalk.bold('Theme Selection'))
  console.log(chalk.yellow('💡 Each theme provides unique personalities and communication styles'))
  console.log(chalk.yellow('   Agents will embody their character traits in all interactions'))
  console.log(chalk.yellow('\n[↑↓] Navigate  [Space] Toggle  [Enter] Continue\n'))
  
  // Direct to theme selection
  const { selectedThemes } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedThemes',
      message: 'Select themes:',
      choices: availableThemes.map(theme => ({
        name: `${theme.emoji} ${theme.name} (${theme.agents.length} agents)`,
        value: theme,
        checked: false
      })),
      loop: false,
      validate: (answer) => {
        if (answer.length < 1) {
          return 'You must select at least one theme.'
        }
        return true
      }
    }
  ])

  return selectedThemes
}

function displayThemeCard(theme) {
  const agentList = theme.agents.slice(0, 4).map(a => a.name).join(', ')
  const remainingCount = theme.agents.length > 4 ? `, +${theme.agents.length - 4} more` : ''
  
  const content = [
    `${theme.agents.length} agents: ${agentList}${remainingCount}`,
    chalk.italic(`"${theme.description}"`),
    chalk.gray(`Ports: ${theme.defaultPortStart || 3011}-${(theme.defaultPortStart || 3011) + theme.agents.length - 1} | Network: ${theme.docker?.network || theme.name.toLowerCase() + '-network'}`)
  ].join('\n')

  const box = boxen(content, {
    title: `${theme.emoji} ${theme.name}`,
    titleAlignment: 'left',
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    borderStyle: 'round',
    borderColor: 'gray',
    dimBorder: true
  })

  console.log(box)
}