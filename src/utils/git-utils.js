import { runCommand, checkCommandExists } from './exec-utils.js'
import fs from 'fs-extra'
import path from 'path'

export async function checkGitHubCLI() {
  return await checkCommandExists('gh')
}

export async function checkGitHubAuth() {
  const result = await runCommand('gh auth status')
  return result.success
}

export async function getGitHubUser() {
  const result = await runCommand('gh api user --jq .login')
  if (result.success) {
    return result.stdout.trim()
  }
  return null
}

export async function checkSSHKey() {
  const sshKeyPath = path.join(process.env.HOME, '.ssh/id_rsa.pub')
  return await fs.exists(sshKeyPath)
}

export async function parseGitHubUrl(url) {
  const githubRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/
  const match = url.match(githubRegex)
  
  if (!match) {
    throw new Error('Invalid GitHub URL format')
  }
  
  return {
    owner: match[1],
    repo: match[2],
    fullName: `${match[1]}/${match[2]}`
  }
}

export async function validateRepository(url) {
  try {
    const { owner, repo } = await parseGitHubUrl(url)
    
    // Check if repository exists and is accessible
    const result = await runCommand(`gh repo view ${owner}/${repo}`)
    return result.success
  } catch (error) {
    return false
  }
}

export async function cloneWithSSH(repoUrl, targetPath) {
  const sshUrl = repoUrl.replace('https://github.com/', 'git@github.com:')
  const result = await runCommand(`git clone ${sshUrl} ${targetPath}`)
  return result.success
}

export async function cloneWithHTTPS(repoUrl, targetPath) {
  const result = await runCommand(`git clone ${repoUrl} ${targetPath}`)
  return result.success
}

export async function cloneWithGH(repoUrl, targetPath) {
  const { fullName } = await parseGitHubUrl(repoUrl)
  const result = await runCommand(`gh repo clone ${fullName} ${targetPath}`)
  return result.success
}