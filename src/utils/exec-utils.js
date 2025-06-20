import { exec } from 'child_process'
import { promisify } from 'util'

export const execAsync = promisify(exec)

export async function runCommand(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, options)
    return { success: true, stdout, stderr }
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      stdout: error.stdout || '', 
      stderr: error.stderr || '' 
    }
  }
}

export async function checkCommandExists(command) {
  const result = await runCommand(`which ${command}`)
  return result.success
}