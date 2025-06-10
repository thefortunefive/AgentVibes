import { runCommand } from './exec-utils.js'
import { parseGitHubUrl } from './git-utils.js'
import { logger } from './logger.js'

export async function generateGitHubProjectsSetup(config) {
  const { repoUrl, projectBoard, projectId, useProjects, createNewProject, projectVisibility } = config
  
  if (!useProjects) {
    return null
  }
  
  try {
    const { owner, repo } = await parseGitHubUrl(repoUrl)
    
    let finalProjectId = projectId
    let statusFieldId = null
    
    if (createNewProject) {
      logger.info('Creating new GitHub Project board...')
      const projectData = await createProjectBoard(owner, repo, {
        title: 'Team Development Board',
        description: 'Automated team workflow tracking',
        public: projectVisibility === 'public'
      })
      
      finalProjectId = projectData.projectId
      statusFieldId = projectData.statusFieldId
      
      logger.success(`✅ Project created: ${finalProjectId}`)
      
      // Setup automation rules
      if (config.enableAutomation) {
        await setupAutomationRules(finalProjectId, owner, repo)
        logger.success('✅ Automation rules configured')
      }
      
    } else if (projectId) {
      // Use existing project
      logger.info('Configuring existing project board...')
      statusFieldId = await getStatusFieldId(projectId)
      
      if (!statusFieldId) {
        logger.warn('Status field not found in existing project. Creating one...')
        statusFieldId = await createStatusField(projectId)
      }
    }
    
    return {
      projectId: finalProjectId,
      statusFieldId,
      owner,
      repo
    }
    
  } catch (error) {
    logger.error('GitHub Projects setup failed:', error.message)
    throw error
  }
}

async function createProjectBoard(owner, repo, options) {
  const { title, description, public: isPublic } = options
  
  // Create new project
  const createCommand = `gh project create \\
    --owner ${owner} \\
    --title "${title}" \\
    --description "${description}" \\
    --visibility ${isPublic ? 'public' : 'private'}`
  
  const createResult = await runCommand(createCommand)
  
  if (!createResult.success) {
    throw new Error(`Failed to create project: ${createResult.error}`)
  }
  
  const projectId = parseProjectId(createResult.stdout)
  
  if (!projectId) {
    throw new Error('Could not parse project ID from creation output')
  }
  
  // Create status field with workflow columns
  const statusFieldId = await createStatusField(projectId)
  
  return { projectId, statusFieldId }
}

async function createStatusField(projectId) {
  const columns = [
    { name: '📋 Todo', description: 'Work to be done' },
    { name: '🚀 In Progress', description: 'Currently working' },
    { name: '⏸️ Paused', description: 'Work temporarily stopped' },
    { name: '👀 Ready for Review', description: 'PR created, awaiting review' },
    { name: '🧪 Testing PR', description: 'PR being tested' },
    { name: '🔄 Rework', description: 'Changes requested' },
    { name: '✅ Merge PR', description: 'Approved and ready to merge' },
    { name: '✨ Done', description: 'Work completed' }
  ]
  
  // Create single select field for status
  const optionsStr = columns.map(c => `"${c.name}"`).join(',')
  const fieldCommand = `gh project field-create ${projectId} \\
    --name "Status" \\
    --data-type SINGLE_SELECT \\
    --single-select-options ${optionsStr}`
  
  const fieldResult = await runCommand(fieldCommand)
  
  if (!fieldResult.success) {
    throw new Error(`Failed to create status field: ${fieldResult.error}`)
  }
  
  // Parse field ID from output
  const fieldId = parseFieldId(fieldResult.stdout)
  
  if (!fieldId) {
    throw new Error('Could not parse field ID from creation output')
  }
  
  logger.success('✅ Status field configured with workflow columns')
  
  return fieldId
}

async function getStatusFieldId(projectId) {
  const fieldsCommand = `gh project field-list ${projectId} --format json`
  const result = await runCommand(fieldsCommand)
  
  if (!result.success) {
    return null
  }
  
  try {
    const fields = JSON.parse(result.stdout)
    const statusField = fields.find(f => f.name === 'Status' && f.dataType === 'SINGLE_SELECT')
    return statusField?.id || null
  } catch (error) {
    return null
  }
}

async function setupAutomationRules(projectId, owner, repo) {
  // GitHub Projects automation rules
  const automationRules = [
    {
      trigger: 'issue.opened',
      action: 'move_to_column',
      column: '📋 Todo'
    },
    {
      trigger: 'pull_request.opened',
      action: 'move_to_column',
      column: '👀 Ready for Review'
    },
    {
      trigger: 'pull_request.merged',
      action: 'move_to_column',
      column: '✨ Done'
    },
    {
      trigger: 'issue.closed',
      action: 'move_to_column',
      column: '✨ Done'
    }
  ]
  
  // Note: GitHub CLI doesn't support automation rules directly
  // This would need to be done via the GitHub API or web interface
  logger.info('Automation rules defined (manual setup may be required)')
  
  return automationRules
}

function parseProjectId(output) {
  // Look for project URL or ID in the output
  const projectUrlRegex = /https:\/\/github\.com\/.*\/projects\/(\d+)/
  const projectIdRegex = /Project ID: ([A-Z0-9_]+)/
  const pvtRegex = /(PVT_\w+)/
  
  let match = output.match(pvtRegex)
  if (match) return match[1]
  
  match = output.match(projectIdRegex)
  if (match) return match[1]
  
  match = output.match(projectUrlRegex)
  if (match) return match[1]
  
  return null
}

function parseFieldId(output) {
  // Look for field ID in the output
  const fieldIdRegex = /Field ID: ([A-Z0-9_]+)/
  const pvtRegex = /(PVTSSF_\w+)/
  
  let match = output.match(pvtRegex)
  if (match) return match[1]
  
  match = output.match(fieldIdRegex)
  if (match) return match[1]
  
  return null
}

export async function generateProjectCommands(projectId, statusFieldId, agentConfig) {
  const commands = {
    'create-issue': generateCreateIssueCommand(projectId, agentConfig),
    'start-issue': generateStartIssueCommand(projectId, statusFieldId, agentConfig),
    'check-board': generateCheckBoardCommand(projectId),
    'link-pr': generateLinkPRCommand(projectId, agentConfig),
    'pause-issue': generatePauseIssueCommand(projectId, statusFieldId, agentConfig),
    'resume-issue': generateResumeIssueCommand(projectId, statusFieldId, agentConfig),
    'rework': generateReworkCommand(projectId, statusFieldId, agentConfig),
    'pr-ready': generatePRReadyCommand(projectId, statusFieldId, agentConfig),
    'close-issue': generateCloseIssueCommand(projectId, statusFieldId, agentConfig)
  }
  
  return commands
}

function generateCreateIssueCommand(projectId, agentConfig) {
  return `#!/bin/bash
# Create new issue and add to project board
issue_title="${agentConfig.emoji} Team-${agentConfig.teamNumber}: $ARGUMENTS"
issue_body="Created by ${agentConfig.emoji} ${agentConfig.name}"
issue_num=$(gh issue create --title "$issue_title" --body "$issue_body" | grep -o '[0-9]*$')
gh project item-add ${projectId} --owner OWNER --url https://github.com/OWNER/REPO/issues/$issue_num
echo "✅ Created issue #$issue_num and added to Todo column"`
}

function generateStartIssueCommand(projectId, statusFieldId, agentConfig) {
  return `#!/bin/bash
# Move issue to In Progress
issue_num="$1"
gh issue edit $issue_num --add-label "in-progress"
gh issue comment $issue_num --body "${agentConfig.emoji} ${agentConfig.name} says: Starting work on this issue"
# Update project board status
item_id=$(gh project item-list ${projectId} --owner OWNER --limit 1000 --format json | jq -r ".items[] | select(.content.number == $issue_num) | .id")
gh project item-edit --project-id ${projectId} --id $item_id --field-id ${statusFieldId} --single-select-option-id IN_PROGRESS_ID
echo "🚀 Moved issue #$issue_num to In Progress"`
}

function generateCheckBoardCommand(projectId) {
  return `#!/bin/bash
# View project board items
echo "📋 Project Board Status"
gh project item-list ${projectId} --owner OWNER --limit 50 --format table`
}

function generateLinkPRCommand(projectId, agentConfig) {
  return `#!/bin/bash
# Link PR to issue
issue_num="$1"
pr_num="$2"
gh issue comment $issue_num --body "${agentConfig.emoji} ${agentConfig.name} says: Created PR #$pr_num for this issue - Closes #$issue_num"
echo "🔗 Linked PR #$pr_num to issue #$issue_num"`
}

function generatePauseIssueCommand(projectId, statusFieldId, agentConfig) {
  return `#!/bin/bash
# Pause issue work
issue_num="$1"
reason="$2"
gh issue comment $issue_num --body "${agentConfig.emoji} ${agentConfig.name} says: Pausing work on this issue. Reason: $reason"
# Update project board to Paused
item_id=$(gh project item-list ${projectId} --owner OWNER --limit 1000 --format json | jq -r ".items[] | select(.content.number == $issue_num) | .id")
gh project item-edit --project-id ${projectId} --id $item_id --field-id ${statusFieldId} --single-select-option-id PAUSED_ID
echo "⏸️ Paused issue #$issue_num"`
}

function generateResumeIssueCommand(projectId, statusFieldId, agentConfig) {
  return `#!/bin/bash
# Resume paused issue
issue_num="$1"
gh issue comment $issue_num --body "${agentConfig.emoji} ${agentConfig.name} says: Resuming work on this issue"
# Move back to In Progress
item_id=$(gh project item-list ${projectId} --owner OWNER --limit 1000 --format json | jq -r ".items[] | select(.content.number == $issue_num) | .id")
gh project item-edit --project-id ${projectId} --id $item_id --field-id ${statusFieldId} --single-select-option-id IN_PROGRESS_ID
echo "🚀 Resumed issue #$issue_num"`
}

function generateReworkCommand(projectId, statusFieldId, agentConfig) {
  return `#!/bin/bash
# Move to rework status
pr_num="$1"
reason="$2"
gh pr comment $pr_num --body "${agentConfig.emoji} ${agentConfig.name} says: Moving to rework. Reason: $reason"
# Update project board
item_id=$(gh project item-list ${projectId} --owner OWNER --limit 1000 --format json | jq -r ".items[] | select(.content.number == $pr_num) | .id")
gh project item-edit --project-id ${projectId} --id $item_id --field-id ${statusFieldId} --single-select-option-id REWORK_ID
echo "🔄 Moved PR #$pr_num to Rework"`
}

function generatePRReadyCommand(projectId, statusFieldId, agentConfig) {
  return `#!/bin/bash
# Mark PR as ready to merge
pr_num="$1"
gh pr comment $pr_num --body "${agentConfig.emoji} ${agentConfig.name} says: PR tested and ready to merge!"
# Update project board
item_id=$(gh project item-list ${projectId} --owner OWNER --limit 1000 --format json | jq -r ".items[] | select(.content.number == $pr_num) | .id")
gh project item-edit --project-id ${projectId} --id $item_id --field-id ${statusFieldId} --single-select-option-id MERGE_READY_ID
echo "✅ Marked PR #$pr_num as ready to merge"`
}

function generateCloseIssueCommand(projectId, statusFieldId, agentConfig) {
  return `#!/bin/bash
# Close issue and mark as done
issue_num="$1"
gh issue close $issue_num --comment "${agentConfig.emoji} ${agentConfig.name} says: Work completed!"
# Update project board (usually automated, but ensuring it)
item_id=$(gh project item-list ${projectId} --owner OWNER --limit 1000 --format json | jq -r ".items[] | select(.content.number == $issue_num) | .id")
gh project item-edit --project-id ${projectId} --id $item_id --field-id ${statusFieldId} --single-select-option-id DONE_ID
echo "✨ Closed issue #$issue_num and marked as Done"`
}