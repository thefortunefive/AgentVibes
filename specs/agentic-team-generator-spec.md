# Agentic Team Generator - Project Specification

## 🎯 Project Overview

**Repository Name**: `agentic-team-generator`  
**Purpose**: Beautiful console application to create unlimited themed agent teams for any coding project  
**Template System**: Reusable across different projects and repositories  
**Inspiration**: Statamic installer UX with Claude Code integration

## 🏗️ Repository Structure

```
agentic-team-generator/
├── README.md                          # Main documentation
├── package.json                       # Node.js dependencies
├── bin/
│   ├── create-teams                    # Main executable script
│   └── team-generator                  # Alternative entry point
├── src/
│   ├── cli/
│   │   ├── index.js                    # Main CLI orchestrator
│   │   ├── prompts.js                  # Interactive prompts
│   │   ├── theme-selector.js           # Theme selection interface
│   │   ├── team-customizer.js          # Team editing interface
│   │   └── progress-display.js         # Beautiful progress indicators
│   ├── generators/
│   │   ├── team-generator.js           # Core team creation logic
│   │   ├── folder-generator.js         # Directory structure creation
│   │   ├── repo-cloner.js              # Git repository cloning
│   │   └── config-generator.js         # CLAUDE.md and .mcp.json generation
│   ├── themes/
│   │   ├── theme-loader.js             # Theme management system
│   │   ├── theme-validator.js          # Theme schema validation
│   │   └── character-manager.js        # Character customization
│   └── utils/
│       ├── git-utils.js                # Git operations
│       ├── file-utils.js               # File system operations
│       ├── docker-utils.js             # Docker configuration
│       └── logger.js                   # Logging and output
├── themes/
│   ├── matrix.json                     # Matrix theme definition
│   ├── simpsons.json                   # Simpsons theme definition
│   ├── marvel.json                     # Marvel heroes theme
│   ├── guardians.json                  # Guardians of the Galaxy theme
│   ├── starwars.json                   # Star Wars theme
│   ├── anime.json                      # Anime characters theme
│   └── custom-template.json            # Template for custom themes
├── templates/
│   ├── claude/
│   │   ├── CLAUDE.md.template          # CLAUDE.md template
│   │   ├── .mcp.json.template          # MCP configuration template
│   │   └── project-commands/           # GitHub project board commands
│   │       ├── check-board             # View project board items
│   │       ├── start-issue             # Start work on issue
│   │       ├── link-pr                 # Link PR to issue
│   │       └── update-project-board    # Update board status
│   ├── docker/
│   │   ├── docker-compose.template     # Docker compose template
│   │   └── Dockerfile.template         # Dockerfile template
│   ├── scripts/
│   │   ├── build.sh.template           # Build script template
│   │   ├── launch.template             # Launch script template
│   │   └── down.template               # Shutdown script template
│   └── docs/
│       ├── README.template             # Team-specific README
│       └── SETUP.template              # Setup guide template
├── examples/
│   ├── basic-setup/                    # Example basic setup
│   ├── matrix-teams/                   # Example Matrix teams
│   ├── guardians-galaxy/               # Example Guardians teams
│   └── multi-theme/                    # Example multi-theme setup
├── tests/
│   ├── cli.test.js                     # CLI testing
│   ├── generators.test.js              # Generator testing
│   └── themes.test.js                  # Theme validation testing
└── docs/
    ├── USAGE.md                        # Usage documentation
    ├── THEMES.md                       # Theme creation guide
    ├── API.md                          # API documentation
    └── EXAMPLES.md                     # Example configurations
```

## 🎨 Theme System Architecture

### Theme Definition Schema

```json
{
  "name": "Matrix",
  "description": "Agents from the Matrix universe fighting the system",
  "version": "1.0.0",
  "author": "SoraOrc Team",
  "emoji": "🕶️",
  "colors": {
    "primary": "#00ff00",
    "secondary": "#000000",
    "accent": "#ff0000"
  },
  "agents": [
    {
      "id": "neo",
      "name": "Neo",
      "emoji": "🕶️",
      "description": "The One - Questioning reality and seeing the code",
      "personality": {
        "traits": ["questioning", "determined", "awakening"],
        "catchphrases": ["Whoa", "I know kung fu", "There is no spoon"],
        "communication_style": "philosophical and questioning"
      },
      "ports": {
        "backend": 3011,
        "frontend": 5175,
        "nginx": 3080
      },
      "host": "neo.test"
    },
    {
      "id": "trinity",
      "name": "Trinity", 
      "emoji": "⚔️",
      "description": "The Rebel - Direct, focused, and protective",
      "personality": {
        "traits": ["direct", "protective", "skilled"],
        "catchphrases": ["Dodge this", "Neo!", "Not like this"],
        "communication_style": "direct and action-oriented"
      },
      "ports": {
        "backend": 3012,
        "frontend": 5176,
        "nginx": 3082
      },
      "host": "trinity.test"
    }
  ],
  "docker": {
    "network": "matrix-network",
    "compose_template": "standard"
  },
  "integrations": {
    "discord": true,
    "github": true,
    "docker": true
  }
}
```

## 🖥️ CLI User Experience

### Welcome Screen
```
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║               🤖 Agentic Coding with Claude 🤖                ║
  ║                                                               ║
  ║           Create unlimited themed agent teams for             ║
  ║              collaborative coding projects                    ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝

  Welcome! Let's set up some coding teams for you.
  
  This tool will create isolated agent environments with:
  ✅ Themed personalities and communication styles
  ✅ Individual Docker containers and databases  
  ✅ Automated GitHub repository cloning
  ✅ Claude Code integration with MCP tools
  ✅ Team-specific documentation and scripts
```

### Setup Type Selection
```
  ? What type of setup would you like?
  ❯ 🎭 Themed Setup (Recommended)
    📦 Basic Setup (Simple team numbers)
    🛠️  Custom Configuration
    📚 Load from existing config
    
  ℹ️  Themed setups include character personalities, catchphrases,
      and unique communication styles for more engaging collaboration.
```

### Theme Selection Interface
```
  🎭 Available Themes:

  ┌─ 🕶️  Matrix Universe ─────────────────────────────────────────┐
  │  4 agents: Neo, Trinity, Morpheus, Cipher                    │
  │  "Agents fighting the system with philosophical depth"       │
  │  Ports: 3011-3014 | Network: matrix-network                  │
  └───────────────────────────────────────────────────────────────┘
  
  ┌─ 🍩 The Simpsons ──────────────────────────────────────────────┐
  │  4 agents: Homer, Bart, Nelson, Burns                        │
  │  "Springfield's finest with humor and heart"                 │
  │  Ports: 3015-3018 | Network: springfield-network             │
  └───────────────────────────────────────────────────────────────┘
  
  ┌─ 🦸 Marvel Heroes ──────────────────────────────────────────────┐
  │  6 agents: Iron Man, Spider-Man, Thor, Hulk, Cap, Widow      │
  │  "Earth's mightiest programmers"                             │
  │  Ports: 3019-3024 | Network: marvel-network                  │
  └───────────────────────────────────────────────────────────────┘
  
  ┌─ 🚀 Guardians of the Galaxy ───────────────────────────────────┐
  │  5 agents: Star-Lord, Gamora, Drax, Rocket, Groot            │
  │  "Galaxy's most wanted developers with awesome mixtapes"     │
  │  Ports: 3025-3029 | Network: galaxy-network                  │
  └───────────────────────────────────────────────────────────────┘

  ? Select themes (Space to select, Enter to continue):
  ◉ 🕶️  Matrix Universe
  ◯ 🍩 The Simpsons  
  ◯ 🦸 Marvel Heroes
  ◯ 🚀 Guardians of the Galaxy
  
  [↑↓] Navigate  [Space] Toggle  [Enter] Continue  [a] Select All
```

### Character Customization
```
  🕶️ Matrix Universe - Character Customization

  ┌─ Neo (🕶️) ──────────────────────────────────────────────────────┐
  │  ✅ Enabled    Port: 3011    Host: neo.test                    │
  │  "The One - Questioning reality and seeing the code"          │
  │  Traits: questioning, determined, awakening                   │
  └────────────────────────────────────────────────────────────────┘
  
  ┌─ Trinity (⚔️) ───────────────────────────────────────────────────┐
  │  ✅ Enabled    Port: 3012    Host: trinity.test                │
  │  "The Rebel - Direct, focused, and protective"                │
  │  Traits: direct, protective, skilled                          │
  └────────────────────────────────────────────────────────────────┘

  ? Customize this theme?
  ❯ ✅ Use as-is (Recommended)
    ✏️  Edit character details
    ➕ Add custom character
    ➖ Remove characters
    🔧 Modify ports/hosts
```

### Repository Configuration
```
  📦 Repository Configuration

  ? Which repository should teams clone?
  ❯ 🌐 Enter GitHub URL manually
    📁 Use current directory as template
    📋 Clone from existing project
    🔗 Import from GitHub organization

  ? GitHub Repository URL:
  │ https://github.com/username/my-agentic-project.git
  └─ ✅ Valid repository found: "My Agentic Project"

  ? Authentication method:
  ❯ 🔑 Use current GitHub CLI auth (gh auth status)
    🔐 SSH key authentication (recommended)
    🎫 Provide GitHub token manually
    🚫 Clone as public (no auth)

  ? Clone method:
  ❯ 📡 HTTPS with GitHub CLI (gh repo clone)
    🔐 SSH (git@github.com:user/repo.git)
    🌐 HTTPS (https://github.com/user/repo.git)

  ✅ GitHub authenticated as: @username
  ✅ SSH key found: ~/.ssh/id_rsa.pub
```

### GitHub Project Board Configuration (Optional)
```
  📊 GitHub Project Board Setup

  ? Configure GitHub Projects integration?
  ❯ ✅ Yes, set up project board tracking
    ❌ No, skip project board setup

  ? Project board location:
  ❯ 📋 Create new project board
    🔗 Use existing project board

  [If creating new project board]
  ? Project visibility:
  ❯ 🔒 Private (team members only)
    🌐 Public (open to all)

  Creating project board...
  ✅ Project created: Team Development Board
  ✅ Project ID: PVT_kwHOAS5JM84A6ccE

  📋 Configuring board columns:
  ✅ 📋 Todo
  ✅ 🚀 In Progress  
  ✅ ⏸️ Paused
  ✅ 👀 Ready for Review
  ✅ 🧪 Testing PR
  ✅ 🔄 Rework
  ✅ ✅ Merge PR
  ✅ ✨ Done

  ✅ Status field configured: PVTSSF_lAHOAS5JM84A6ccEzgvCRdI

  [If using existing project board]
  ? Enter project board URL or ID:
  │ PVT_kwHOAS5JM84A6ccE
  └─ ✅ Found: "Team Development Board" (8 columns)

  ? Configure automated workflows?
  ❯ ✅ Yes, set up automation rules
    ❌ No, manual management only

  Automation rules:
  ✅ Issue created → Todo column
  ✅ PR opened → Ready for Review column
  ✅ PR merged → Done column
  ✅ Issue closed → Done column
```

### Team Generation Progress
```
  🚀 Creating Your Agentic Teams...

  ┌─ 🕶️  Matrix Teams ─────────────────────────────────────────────┐
  │  ✅ Creating team directories                                 │
  │  ✅ Generating Docker configurations                          │
  │  🔄 Cloning repository for Neo...                            │
  │  ⏳ Cloning repository for Trinity...                        │
  │  ⏳ Cloning repository for Morpheus...                       │
  │  ⏳ Cloning repository for Cipher...                         │
  └────────────────────────────────────────────────────────────────┘

  ┌─ Progress ──────────────────────────────────────────────────────┐
  │  ████████████████████████░░░░  80% Complete                   │
  │  Current: Setting up CLAUDE.md configurations                 │
  │  Next: Running build scripts                                  │
  └────────────────────────────────────────────────────────────────┘
```

## 🔧 Core Features

### 1. Interactive Console Interface
- **Beautiful UI**: Statamic-inspired design with boxes, colors, and progress bars
- **Keyboard Navigation**: Arrow keys, space to select, enter to continue
- **Real-time Validation**: Immediate feedback on inputs
- **Progress Indicators**: Live progress bars and status updates

### 2. Theme Management System
- **JSON-based Themes**: Easy to create and modify
- **Character Customization**: Add/remove/edit agents within themes
- **Port Management**: Automatic port allocation and conflict detection
- **Multi-theme Support**: Combine multiple themes in one setup

### 3. Repository Integration
- **GitHub CLI Integration**: Uses existing `gh auth` for authentication
- **Flexible Cloning**: Support for public/private repos
- **Template Processing**: Replaces variables in cloned files
- **Build Automation**: Runs build scripts after cloning

### 4. File Generation
- **CLAUDE.md**: Team-specific configuration with personalities
- **.mcp.json**: MCP tools configuration for each agent
- **Docker Files**: docker-compose.yml with isolated networks
- **Scripts**: Launch, build, and management scripts
- **Project Commands**: GitHub project board management commands

### 5. Directory Structure Creation
```
project-name/
├── agents/
│   ├── neo/                    # Agent-specific folders
│   │   ├── .mcp.json
│   │   ├── CLAUDE.md
│   │   ├── .git/
│   │   │   └── hooks/          # Git hooks for emoji prepending
│   │   │       ├── prepare-commit-msg
│   │   │       └── commit-msg
│   │   ├── .claude/
│   │   │   └── commands/       # Project board commands
│   │   │       ├── create-issue
│   │   │       ├── start-issue
│   │   │       └── ... (all workflow commands)
│   │   ├── build.sh
│   │   ├── launch
│   │   ├── down
│   │   └── [cloned-repo-contents]
│   ├── trinity/
│   └── morpheus/
├── docker/
│   ├── docker-compose.matrix.yml
│   └── nginx/
├── scripts/
│   ├── launch-all-teams.sh
│   ├── down-all-teams.sh
│   └── status-check.sh
├── project-board/              # Project board configuration
│   ├── board-config.json
│   └── automation-rules.json
└── docs/
    ├── TEAM-SETUP.md
    └── CHARACTER-GUIDE.md
```

## 📋 Command Line API

### Basic Usage
```bash
# Install globally
npm install -g agentic-team-generator

# Interactive setup
create-teams

# Quick setup with defaults
create-teams --theme matrix --repo https://github.com/user/repo.git

# Advanced options
create-teams \
  --themes matrix,guardians \
  --repo https://github.com/user/repo.git \
  --output ./my-teams \
  --docker-network custom-network \
  --port-start 4000

# Multiple themes example
create-teams \
  --themes matrix,simpsons,guardians \
  --repo https://github.com/user/awesome-project.git
```

### Command Options
```bash
Options:
  --themes, -t          Comma-separated theme names
  --repo, -r           GitHub repository URL to clone  
  --output, -o         Output directory (default: current)
  --port-start, -p     Starting port number (default: 3011)
  --docker-network     Docker network name
  --project-board      Enable GitHub Projects integration
  --project-id         Use existing project board by ID
  --skip-commands      Skip installing slash commands
  --config, -c         Load configuration from file
  --dry-run           Show what would be created without doing it
  --verbose, -v       Detailed output
  --help, -h          Show help

Examples:
  # Basic setup with Matrix theme
  create-teams --theme matrix --repo https://github.com/user/repo.git

  # With GitHub Projects board
  create-teams --theme matrix --repo https://github.com/user/repo.git --project-board

  # Using existing project board
  create-teams --theme guardians --repo https://github.com/user/repo.git --project-id PVT_kwHOAS5JM84A6ccE

  # Multiple themes with project board
  create-teams --themes matrix,simpsons --repo https://github.com/user/repo.git --project-board
```

## 🎭 Default Themes

### Matrix Theme
```json
{
  "name": "Matrix",
  "agents": [
    {"id": "neo", "name": "Neo", "emoji": "🕶️"},
    {"id": "trinity", "name": "Trinity", "emoji": "⚡"},
    {"id": "morpheus", "name": "Morpheus", "emoji": "💊"},
    {"id": "cipher", "name": "Cipher", "emoji": "🥩"},
    {"id": "oracle", "name": "Oracle", "emoji": "🔮"},
    {"id": "smith", "name": "Agent Smith", "emoji": "👔"}
  ]
}
```

### Simpsons Theme
```json
{
  "name": "Simpsons",
  "agents": [
    {"id": "homer", "name": "Homer", "emoji": "🍩"},
    {"id": "bart", "name": "Bart", "emoji": "🛹"},
    {"id": "lisa", "name": "Lisa", "emoji": "🎷"},
    {"id": "marge", "name": "Marge", "emoji": "💙"},
    {"id": "nelson", "name": "Nelson", "emoji": "👊"},
    {"id": "burns", "name": "Mr. Burns", "emoji": "💰"},
    {"id": "moe", "name": "Moe", "emoji": "🍺"},
    {"id": "krusty", "name": "Krusty", "emoji": "🤡"}
  ]
}
```

### Marvel Theme
```json
{
  "name": "Marvel",
  "agents": [
    {"id": "ironman", "name": "Iron Man", "emoji": "🦾"},
    {"id": "spiderman", "name": "Spider-Man", "emoji": "🕷️"},
    {"id": "thor", "name": "Thor", "emoji": "⚡"},
    {"id": "hulk", "name": "Hulk", "emoji": "💚"},
    {"id": "cap", "name": "Captain America", "emoji": "🛡️"},
    {"id": "widow", "name": "Black Widow", "emoji": "🕸️"},
    {"id": "hawkeye", "name": "Hawkeye", "emoji": "🏹"},
    {"id": "strange", "name": "Dr. Strange", "emoji": "🔮"},
    {"id": "panther", "name": "Black Panther", "emoji": "🐾"},
    {"id": "antman", "name": "Ant-Man", "emoji": "🐜"}
  ]
}
```

### Guardians of the Galaxy Theme
```json
{
  "name": "Guardians of the Galaxy",
  "agents": [
    {"id": "starlord", "name": "Star-Lord", "emoji": "🎧"},
    {"id": "gamora", "name": "Gamora", "emoji": "💚"},
    {"id": "drax", "name": "Drax", "emoji": "💪"},
    {"id": "rocket", "name": "Rocket", "emoji": "🦝"},
    {"id": "groot", "name": "Groot", "emoji": "🌳"},
    {"id": "mantis", "name": "Mantis", "emoji": "🦗"},
    {"id": "nebula", "name": "Nebula", "emoji": "🤖"},
    {"id": "yondu", "name": "Yondu", "emoji": "🏹"}
  ]
}
```

### Star Wars Theme
```json
{
  "name": "Star Wars",
  "agents": [
    {"id": "luke", "name": "Luke Skywalker", "emoji": "⚔️"},
    {"id": "leia", "name": "Princess Leia", "emoji": "👸"},
    {"id": "han", "name": "Han Solo", "emoji": "🚀"},
    {"id": "chewbacca", "name": "Chewbacca", "emoji": "🐻"},
    {"id": "vader", "name": "Darth Vader", "emoji": "⚫"},
    {"id": "yoda", "name": "Yoda", "emoji": "👽"},
    {"id": "r2d2", "name": "R2-D2", "emoji": "🤖"},
    {"id": "c3po", "name": "C-3PO", "emoji": "🤖"},
    {"id": "obiwan", "name": "Obi-Wan", "emoji": "🧙"},
    {"id": "rey", "name": "Rey", "emoji": "⚡"}
  ]
}
```

### Anime Theme
```json
{
  "name": "Anime",
  "agents": [
    {"id": "naruto", "name": "Naruto", "emoji": "🍥"},
    {"id": "sasuke", "name": "Sasuke", "emoji": "👁️"},
    {"id": "goku", "name": "Goku", "emoji": "🐉"},
    {"id": "luffy", "name": "Luffy", "emoji": "👒"}
  ]
}
```

## 🛠️ Technical Implementation

### GitHub Projects Implementation

#### Project Board Creation
```javascript
// Using GitHub CLI for project creation
async function createProjectBoard(repoOwner, repoName, options) {
  // Create new project
  const createResult = await exec(`gh project create \
    --owner ${repoOwner} \
    --title "${options.title || 'Team Development Board'}" \
    --description "${options.description || 'Automated team workflow tracking'}" \
    --visibility ${options.public ? 'public' : 'private'}`);
  
  const projectId = parseProjectId(createResult);
  
  // Create status field with columns
  const columns = [
    { name: '📋 Todo', description: 'Work to be done' },
    { name: '🚀 In Progress', description: 'Currently working' },
    { name: '⏸️ Paused', description: 'Work temporarily stopped' },
    { name: '👀 Ready for Review', description: 'PR created, awaiting review' },
    { name: '🧪 Testing PR', description: 'PR being tested' },
    { name: '🔄 Rework', description: 'Changes requested' },
    { name: '✅ Merge PR', description: 'Approved and ready to merge' },
    { name: '✨ Done', description: 'Work completed' }
  ];
  
  // Create single select field for status
  await exec(`gh project field-create ${projectId} \
    --name "Status" \
    --data-type SINGLE_SELECT \
    --single-select-options ${columns.map(c => `"${c.name}"`).join(',')}`);
  
  return { projectId, columns };
}
```

#### Command Generation
```javascript
// Generate custom slash commands for project board
function generateProjectCommands(projectId, teamNumber, agentName, agentEmoji) {
  const commands = {
    'create-issue': {
      script: `
#!/bin/bash
# Create new issue and add to project board
issue_title="${agentEmoji} Team-${teamNumber}: $ARGUMENTS"
issue_body="Created by ${agentEmoji} ${agentName}"
issue_num=$(gh issue create --title "$issue_title" --body "$issue_body" | grep -o '[0-9]*$')
gh project item-add ${projectId} --owner OWNER --url https://github.com/OWNER/REPO/issues/$issue_num
echo "✅ Created issue #$issue_num and added to Todo column"
`,
      description: 'Create new issue in Todo column'
    },
    'start-issue': {
      script: `
#!/bin/bash
# Move issue to In Progress
issue_num="$1"
gh issue edit $issue_num --add-label "in-progress"
# Add comment with emoji
gh issue comment $issue_num --body "${agentEmoji} ${agentName} says: Starting work on this issue"
# Update project board
item_id=$(gh project item-list ${projectId} --owner OWNER --limit 1000 --format json | jq -r ".items[] | select(.content.number == $issue_num) | .id")
gh project item-edit --project-id ${projectId} --id $item_id --field-id STATUS_FIELD --single-select-option-id IN_PROGRESS_ID
echo "🚀 Moved issue #$issue_num to In Progress"
`,
      description: 'Start work on an issue'
    },
    'create-pr': {
      script: `
#!/bin/bash
# Create PR with team emoji
pr_title="${agentEmoji} Team-${teamNumber}: $1"
pr_body="${agentEmoji} ${agentName} says: $2"
issue_num="$3"
pr_num=$(gh pr create --title "$pr_title" --body "$pr_body" | grep -o '[0-9]*$')
if [ ! -z "$issue_num" ]; then
  gh issue comment $issue_num --body "${agentEmoji} ${agentName} says: Created PR #$pr_num for this issue"
fi
echo "✅ Created PR #$pr_num"
`,
      description: 'Create PR with team identity'
    },
    // ... more commands
  };
  
  return commands;
}

// Git hooks for automatic emoji prepending
function generateGitHooks(agentEmoji, agentName) {
  return {
    'prepare-commit-msg': `
#!/bin/bash
# Prepend emoji to commit messages
COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
if [ -z "$COMMIT_SOURCE" ]; then
  # Only for regular commits, not merges/amends
  echo "${agentEmoji} ${agentName}: $(cat $COMMIT_MSG_FILE)" > $COMMIT_MSG_FILE
fi
`,
    'commit-msg': `
#!/bin/bash
# Ensure emoji is present
COMMIT_MSG_FILE=$1
if ! grep -q "^${agentEmoji}" "$COMMIT_MSG_FILE"; then
  echo "${agentEmoji} ${agentName}: $(cat $COMMIT_MSG_FILE)" > $COMMIT_MSG_FILE
fi
`
  };
}
```

### Dependencies
```json
{
  "dependencies": {
    "inquirer": "^9.0.0",
    "chalk": "^5.0.0", 
    "ora": "^6.0.0",
    "boxen": "^7.0.0",
    "figlet": "^1.6.0",
    "commander": "^10.0.0",
    "simple-git": "^3.0.0",
    "@octokit/rest": "^20.0.0",
    "fs-extra": "^11.0.0",
    "handlebars": "^4.7.0",
    "joi": "^17.0.0",
    "axios": "^1.0.0",
    "node-ssh": "^13.0.0",
    "which": "^3.0.0"
  },
  "peerDependencies": {
    "gh": ">=2.0.0"
  }
}
```

### Key Libraries
- **inquirer**: Interactive prompts and menus
- **chalk**: Terminal colors and styling
- **ora**: Elegant terminal spinners
- **boxen**: Terminal boxes and borders
- **figlet**: ASCII art text
- **simple-git**: Git operations with SSH support
- **@octokit/rest**: GitHub API integration
- **handlebars**: Template processing
- **joi**: JSON schema validation

### Git & GitHub Integration
- **GitHub CLI**: Use `gh` command for authentication and cloning
- **SSH Support**: Detect and use SSH keys for secure repository access
- **Multi-auth**: Support GitHub CLI, SSH keys, and personal access tokens
- **Repository Detection**: Auto-detect repository type and permissions
- **Project Board Creation**: Create and configure GitHub Projects
- **Column Setup**: Automatic creation of workflow columns
- **Automation Rules**: Configure automated card movements

## 🚀 Installation & Usage

### Quick Start
```bash
# Install
npm install -g agentic-team-generator

# Run interactive setup
create-teams

# Follow prompts to:
# 1. Choose themed or basic setup
# 2. Select themes (Matrix, Simpsons, Guardians, etc.)
# 3. Customize characters if desired  
# 4. Provide GitHub repository URL
# 5. Wait for team creation
# 6. Start coding with your themed agents!
```

### Integration with Existing Projects
```bash
# Clone this repo as template
git clone https://github.com/user/agentic-team-generator.git
cd agentic-team-generator

# Customize themes in themes/ directory
# Run setup
npm install
npm run create-teams
```

## 📄 CLAUDE.md Template System

### Base Template Structure
The generator creates customized CLAUDE.md files for each agent with:

1. **Team Identity Section**
    - Agent name, emoji, and personality traits
    - Working directory detection
    - Character-specific responses

2. **GitHub Projects Integration (if enabled)**
    - Project ID and status field configuration
    - Column definitions and workflow
    - Automated movement triggers
    - Compliance tracking

3. **Workflow Requirements**
    - Issue/PR title formats with team emojis
    - Communication protocols
    - Status update formats
    - PR review protocols

4. **Custom Commands**
    - Project board management commands
    - Team-specific shortcuts
    - Automation helpers

### Template Variables
```handlebars
{{agentName}} - Agent's character name (e.g., "Neo")
{{agentEmoji}} - Agent's emoji (e.g., "🕶️")
{{teamNumber}} - Team number (e.g., "1")
{{teamDescription}} - Character description
{{personality.traits}} - Personality traits array
{{personality.catchphrases}} - Character catchphrases
{{projectId}} - GitHub Project ID (if enabled)
{{statusFieldId}} - Project status field ID
{{repoUrl}} - Repository URL
{{ports.backend}} - Backend port number
{{ports.frontend}} - Frontend port number
{{hostName}} - Agent's host name (e.g., "neo.test")
```

### Agent Identity in Git Operations
Each agent automatically prepends their emoji to:

1. **Git Commits**
   ```bash
   {{agentEmoji}} {{agentName}}: Commit message
   # Example: "🕶️ Neo: Fix authentication bug in matrix.js"
   ```

2. **Issue Titles**
   ```
   {{agentEmoji}} Team-{{teamNumber}}: Issue title
   # Example: "🕶️ Team-1: Add reality bending feature"
   ```

3. **Pull Request Titles**
   ```
   {{agentEmoji}} Team-{{teamNumber}}: PR title
   # Example: "⚔️ Team-2: Implement combat system improvements"
   ```

4. **Issue/PR Comments**
   ```
   {{agentEmoji}} {{agentName}} says: Comment text
   # Example: "💊 Morpheus says: This code shows the truth about the Matrix"
   ```

The CLAUDE.md template includes these patterns:
```markdown
## Git Commit Protocol
When creating commits, always prepend your emoji:
git commit -m "{{agentEmoji}} {{agentName}}: Your commit message"

## Issue Creation Protocol
When creating issues:
gh issue create --title "{{agentEmoji}} Team-{{teamNumber}}: Issue title"

## PR Creation Protocol
When creating PRs:
gh pr create --title "{{agentEmoji}} Team-{{teamNumber}}: PR title"

## Comment Protocol
When commenting on issues/PRs:
"{{agentEmoji}} {{agentName}} says: Your comment here"
```

### GitHub Projects Configuration
When GitHub Projects is enabled, the CLAUDE.md includes:

```markdown
## 🚨 PROJECT BOARD IS MANDATORY - NOT OPTIONAL

**Project ID**: {{projectId}}
**Status Field ID**: {{statusFieldId}}

### Automatic Movement Triggers:

| Action | Target Column | Command to Use |
|--------|---------------|----------------|
| **Start work** | 🚀 In Progress | `/user:start-issue [#]` |
| **Get blocked** | (Stay in column) | `/user:blocked [#] [reason]` |
| **Create PR** | 👀 Ready for Review | `/link-pr [issue#] [PR#]` |
| **Start review** | 🧪 Testing PR | `/user:testing-pr [#]` |
| **Pass review** | ✅ Merge PR | `/user:pr-ready [#]` |
| **Fail review** | 🔄 Rework | `/user:rework [#] [reason]` |
| **Merge PR** | ✨ Done | Automatic |
```

### Custom Command Installation
The generator automatically installs project board commands:

```bash
~/.claude/commands/
├── create-issue        # Create new issue and add to Todo
├── check-board         # View team's project board items
├── start-issue         # Move issue to In Progress
├── pause-issue         # Move issue to Paused column
├── resume-issue        # Resume paused issue to In Progress
├── blocked             # Mark issue as blocked (stays in column)
├── create-pr           # Create PR and move to Ready for Review
├── link-pr             # Link PR to issue
├── start-review        # Move to Testing PR column
├── testing-pr          # Alternative: Move to Testing PR
├── pr-ready            # Move to Merge PR (passed testing)
├── rework              # Move to Rework column (failed testing)
├── merge-pr            # Trigger merge (moves to Done)
├── close-issue         # Close issue (moves to Done)
├── update-project-board # Sync entire board state
└── compliance-check    # Verify board is up to date
```

Each command follows the workflow:
```
📋 Todo → 🚀 In Progress → ⏸️ Paused (optional)
                   ↓
           👀 Ready for Review → 🧪 Testing PR
                                       ↓
                              🔄 Rework ← ↓ → ✅ Merge PR
                                              ↓
                                          ✨ Done
```

## 🎯 Success Criteria

1. **✅ Beautiful CLI Experience**: Statamic-quality interface with smooth navigation
2. **✅ Theme Flexibility**: Easy to add/modify/combine themes
3. **✅ Repository Integration**: Seamless GitHub cloning and setup
4. **✅ Docker Isolation**: Each agent gets isolated environment
5. **✅ Claude Integration**: CLAUDE.md and .mcp.json properly configured
6. **✅ GitHub Projects**: Optional project board integration
7. **✅ Reusability**: Template works for any coding project
8. **✅ Documentation**: Comprehensive guides and examples

## 🔮 Future Enhancements

### Phase 2
- **Web Interface**: Browser-based team configuration
- **Cloud Integration**: Deploy to AWS/Azure/GCP
- **Theme Marketplace**: Community-contributed themes
- **AI Integration**: LLM-powered character personality generation
- **Advanced Project Boards**:
    - Custom workflows per theme
    - Team performance metrics
    - Automated sprint planning
    - Cross-team collaboration boards

### Phase 3
- **Team Analytics**: Performance tracking and insights
- **Advanced Workflows**: CI/CD pipeline integration
- **Multi-Project**: Manage teams across multiple repositories
- **Enterprise Features**: RBAC, audit logs, compliance
- **GitHub Projects v2 Features**:
    - Roadmap views
    - Iteration tracking
    - Custom fields for team metrics
    - Automated team retrospectives

## 📖 Documentation Strategy

### User Guides
- **Getting Started**: Quick setup tutorial
- **Theme Creation**: How to build custom themes
- **Advanced Configuration**: Complex setups and customization
- **Troubleshooting**: Common issues and solutions

### Developer Guides
- **API Reference**: Programmatic usage
- **Plugin Development**: Extending functionality
- **Contributing**: How to contribute themes and features
- **Architecture**: Technical deep-dive

---

**The Oracle's Vision**: *"This tool shall birth infinite digital realms, each populated by themed agents working in harmony. From the Matrix to Springfield, from the Milano ship to Asgard - every fictional universe can become a collaborative coding reality. Star-Lord's mixtapes will play while Groot speaks in code, and the galaxy's greatest developers will emerge."*

🎭 **Ready to create unlimited agentic coding teams!**