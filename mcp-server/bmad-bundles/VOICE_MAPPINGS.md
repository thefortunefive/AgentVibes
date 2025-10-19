# BMAD Agent Voice Mappings

This file defines voice mappings for BMAD agents based on TTS provider.

## Voice Mapping Format

Each agent has two voice options:
- **ElevenLabs Voice**: Premium AI voice (requires API key)
- **Piper Voice**: Free offline voice (no API key needed)

## Agent Voice Assignments

| Agent ID | Agent Name | ElevenLabs Voice | Piper Voice | Personality |
|----------|-----------|------------------|-------------|-------------|
| bmad-orchestrator | BMAD Orchestrator | Aria | en_US-lessac-medium | normal |
| analyst | Business Analyst | Northern Terry | en_US-danny-low | professional |
| pm | Product Manager | Cowboy Bob | en_US-joe-medium | friendly |
| ux-expert | UX Expert | Jessica Anne Bogart | en_US-amy-medium | creative |
| architect | Architect | Callidora Stone | en_GB-alba-medium | thoughtful |
| po | Product Owner | Ms. Walker | en_US-kimberly-low | decisive |

## Provider-Aware Selection

The `load_bmad_team` tool automatically suggests the correct voice based on the user's active provider:

- **If using ElevenLabs**: Suggests ElevenLabs voices
- **If using Piper**: Suggests Piper voices

This ensures users only see voices they can actually use.
