import path from 'path'
import fs from 'fs-extra'

export async function generateFolderStructure(outputDir, characterConfig) {
  const agentRoot = path.join(outputDir, characterConfig.paths.root)
  
  // Create main agent directory
  await fs.ensureDir(agentRoot)
  
  // Create subdirectories
  const subdirs = [
    '.claude/commands',
    '.git/hooks',
    'src',
    'tests',
    'docs',
    'config',
    'scripts'
  ]
  
  for (const subdir of subdirs) {
    await fs.ensureDir(path.join(agentRoot, subdir))
  }
  
  // Create .gitkeep files to preserve empty directories
  const gitkeepDirs = ['src', 'tests', 'docs', 'config']
  for (const dir of gitkeepDirs) {
    await fs.writeFile(
      path.join(agentRoot, dir, '.gitkeep'),
      '# This file preserves the directory structure\n'
    )
  }
  
  return agentRoot
}