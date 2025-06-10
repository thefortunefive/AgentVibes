import simpleGit from 'simple-git'
import { execAsync } from '../utils/exec-utils.js'
import { logger } from '../utils/logger.js'
import fs from 'fs-extra'
import path from 'path'

export async function cloneRepository(repoUrl, targetPath, options = {}) {
  const { authMethod, agentName } = options
  
  try {
    // Check if directory already has a git repo
    if (await fs.exists(path.join(targetPath, '.git'))) {
      logger.warn(`Directory ${targetPath} already contains a git repository`)
      return
    }
    
    // Determine clone method based on auth
    let cloneUrl = repoUrl
    let cloneCommand = ''
    
    switch (authMethod) {
      case 'gh':
        // Use GitHub CLI
        const repoPath = repoUrl.replace('https://github.com/', '').replace('.git', '')
        cloneCommand = `gh repo clone ${repoPath} ${targetPath}`
        break
        
      case 'ssh':
        // Convert to SSH URL if needed
        if (repoUrl.startsWith('https://github.com/')) {
          cloneUrl = repoUrl.replace('https://github.com/', 'git@github.com:')
        }
        break
        
      case 'token':
        // Token will be handled via git config
        break
        
      case 'public':
      default:
        // Use HTTPS URL as-is
        break
    }
    
    // Clone the repository
    if (cloneCommand) {
      // Use GitHub CLI
      logger.info(`Cloning repository for ${agentName} using GitHub CLI...`)
      await execAsync(cloneCommand)
    } else {
      // Use simple-git
      logger.info(`Cloning repository for ${agentName}...`)
      const git = simpleGit()
      await git.clone(cloneUrl, targetPath, ['--depth', '1'])
    }
    
    // Remove existing git hooks to replace with our own
    const hooksDir = path.join(targetPath, '.git', 'hooks')
    const existingHooks = await fs.readdir(hooksDir)
    for (const hook of existingHooks) {
      if (!hook.endsWith('.sample')) {
        await fs.remove(path.join(hooksDir, hook))
      }
    }
    
    logger.success(`Repository cloned successfully for ${agentName}`)
    
  } catch (error) {
    logger.error(`Failed to clone repository: ${error.message}`)
    throw error
  }
}

export async function setupGitConfig(targetPath, agentConfig) {
  const git = simpleGit(targetPath)
  
  // Set user name and email for the agent
  await git.addConfig('user.name', agentConfig.name)
  await git.addConfig('user.email', `${agentConfig.id}@agentic-team.local`)
  
  // Set commit template if needed
  const commitTemplate = path.join(targetPath, '.gitmessage')
  await fs.writeFile(
    commitTemplate,
    `${agentConfig.emoji} ${agentConfig.name}: 

# Team ${agentConfig.teamNumber} - ${agentConfig.theme}
# Character: ${agentConfig.description}
`
  )
  
  await git.addConfig('commit.template', commitTemplate)
}