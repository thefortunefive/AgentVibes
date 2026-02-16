/**
 * AgentVibes Web Voice Chat Server
 * 
 * Hono-based HTTP server providing:
 * - POST /api/chat - Chat with LLM + TTS
 * - GET /api/voices - List available TTS voices
 * - POST /api/voice - Set active voice
 * - GET /api/status - Get TTS engine status
 * - Static file serving for frontend
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { getLLMProvider, ChatMessage } from './llm.js';
import { getTTSProvider } from './tts.js';
import { NocoDBClient, getNocoDBClient, NocoDBTable, NocoDBRecord, ListRecordsParams } from './nocodb.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  voice?: string;
  personality?: string;
  language?: string;
  sentiment?: string;
}

interface ChatResponse {
  reply: string;
  audioUrl?: string;
  voice: string;
  success: boolean;
  error?: string;
}

interface VoiceRequest {
  voice: string;
}

// Initialize providers
const llm = getLLMProvider();
const tts = getTTSProvider();
const nocodb = getNocoDBClient();

// NocoDB Tool Definitions for LLM
const NOCODB_TOOLS = `
You have access to the following NocoDB database tools. When you want to perform a database operation, output a JSON action block like this:

ACTION: {"tool": "listTables"}
ACTION: {"tool": "listRecords", "tableId": "m9m6gh688zrhkb4", "limit": 10}
ACTION: {"tool": "searchRecords", "tableId": "m9m6gh688zrhkb4", "query": "AI content"}
ACTION: {"tool": "createRecord", "tableId": "m9m6gh688zrhkb4", "data": {"Title": "New Post", "Status": "Draft"}}
ACTION: {"tool": "updateRecord", "tableId": "m9m6gh688zrhkb4", "recordId": "rec123", "data": {"Status": "Published"}}
ACTION: {"tool": "deleteRecord", "tableId": "m9m6gh688zrhkb4", "recordId": "rec123"}

Available Tables:
- Social Posts (m9m6gh688zrhkb4): Social media content calendar
- Social Posts - AI (mi0xcrv7gp5inbh): AI-generated social content
- YouTube Content Pipeline (m48lt8phy1o2y04): YouTube video production pipeline

Tools:
1. listTables - Lists all tables in the database
2. listRecords - Lists records from a table (params: tableId, limit, offset, where, sort)
3. searchRecords - Searches records by query string (params: tableId, query, limit)
4. createRecord - Creates a new record (params: tableId, data)
5. updateRecord - Updates an existing record (params: tableId, recordId, data)
6. deleteRecord - Deletes a record (params: tableId, recordId)
`;

// Parse action blocks from LLM response
function parseActionBlocks(text: string): Array<{tool: string; [key: string]: any}> | null {
  const actions = [];
  const regex = /ACTION:\s*(\{[^}]+\})/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const action = JSON.parse(match[1]);
      actions.push(action);
    } catch (e) {
      console.error('Failed to parse action block:', match[1]);
    }
  }
  return actions.length > 0 ? actions : null;
}

// Execute NocoDB action
async function executeNocoDBAction(action: {tool: string; [key: string]: any}): Promise<any> {
  const { tool, ...params } = action;
  
  switch (tool) {
    case 'listTables':
      return await nocodb.listTables();
    case 'listRecords':
      return await nocodb.listRecords(params.tableId, {
        limit: params.limit,
        offset: params.offset,
        where: params.where,
        sort: params.sort,
        fields: params.fields,
      });
    case 'searchRecords':
      return await nocodb.searchRecords(params.tableId, params.query, params.limit);
    case 'createRecord':
      return await nocodb.createRecord(params.tableId, params.data);
    case 'updateRecord':
      return await nocodb.updateRecord(params.tableId, params.recordId, params.data);
    case 'deleteRecord':
      return await nocodb.deleteRecord(params.tableId, params.recordId);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// Create Hono app
const app = new Hono();

// Enable CORS for all API routes
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * POST /api/chat
 * Main chat endpoint - sends message to LLM, then synthesizes response to speech
 */
app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json<ChatRequest>();
    const { message, history = [], voice, personality, language, sentiment } = body;

    if (!message || typeof message !== 'string') {
      return c.json<ChatResponse>({
        reply: '',
        voice: '',
        success: false,
        error: 'Message is required',
      }, 400);
    }

    // Add system prompt and convert history to ChatMessage format
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are AgentVibes, a voice-powered AI assistant for Fifth Avenue AI. You help manage content, answer questions, and control the NocoDB database. Keep responses concise — under 3 sentences — since they will be spoken aloud.

${NOCODB_TOOLS}

When the user asks about database operations, include the appropriate ACTION block in your response. The system will execute it and provide results.`
    };

    const chatHistory: ChatMessage[] = [
      systemMessage,
      ...history.map(h => ({
        role: h.role as 'system' | 'user' | 'assistant',
        content: h.content,
      }))
    ];

    // Get LLM response
    let reply = await llm.sendMessage(message, chatHistory);

    if (!reply) {
      return c.json<ChatResponse>({
        reply: '',
        voice: voice || '',
        success: false,
        error: 'LLM returned empty response',
      }, 500);
    }

    // Parse and execute any action blocks from LLM response
    const actions = parseActionBlocks(reply);
    let actionResults = [];
    
    if (actions && actions.length > 0) {
      // Remove action blocks from spoken response
      reply = reply.replace(/ACTION:\s*\{[^}]+\}/g, '').trim();
      
      // Execute actions
      for (const action of actions) {
        try {
          const result = await executeNocoDBAction(action);
          actionResults.push({ action, result, success: true });
          
          // Append brief result summary to reply
          if (action.tool === 'listTables') {
            const tables = result as NocoDBTable[];
            reply += `\nI found ${tables.length} tables: ${tables.slice(0, 3).map(t => t.title).join(', ')}${tables.length > 3 ? ' and more' : ''}.`;
          } else if (action.tool === 'listRecords' || action.tool === 'searchRecords') {
            const records = result as NocoDBRecord[];
            reply += `\nFound ${records.length} records.`;
          }
        } catch (error) {
          actionResults.push({ action, error: (error as Error).message, success: false });
          reply += `\nSorry, I couldn't complete that database operation.`;
        }
      }
    }

    // Synthesize speech
    const ttsResult = await tts.speak({
      text: reply,
      voice,
      personality,
      language,
      sentiment,
    });

    if (!ttsResult.success) {
      return c.json<ChatResponse>({
        reply,
        voice: ttsResult.voice,
        success: true, // LLM succeeded even if TTS failed
        error: `TTS failed: ${ttsResult.error}`,
      }, 200);
    }

    // Generate URL for audio file
    const audioUrl = `/audio/${path.basename(ttsResult.audioPath)}`;

    return c.json<ChatResponse>({
      reply,
      audioUrl,
      voice: ttsResult.voice,
      success: true,
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    return c.json<ChatResponse>({
      reply: '',
      voice: '',
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

/**
 * GET /api/voices
 * List available TTS voices
 */
app.get('/api/voices', async (c) => {
  try {
    const voices = await tts.listVoices();
    
    return c.json({
      voices,
      count: voices.length,
      success: true,
    });
  } catch (error) {
    console.error('Voices endpoint error:', error);
    return c.json({
      voices: [],
      count: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list voices',
    }, 500);
  }
});

/**
 * POST /api/voice
 * Set the active voice
 */
app.post('/api/voice', async (c) => {
  try {
    const body = await c.req.json<VoiceRequest>();
    const { voice } = body;

    if (!voice || typeof voice !== 'string') {
      return c.json({
        success: false,
        error: 'Voice name is required',
      }, 400);
    }

    const success = await tts.setVoice(voice);

    if (!success) {
      return c.json({
        success: false,
        error: `Failed to set voice: ${voice}`,
      }, 400);
    }

    return c.json({
      success: true,
      voice,
      message: `Voice switched to: ${voice}`,
    });

  } catch (error) {
    console.error('Voice endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set voice',
    }, 500);
  }
});

/**
 * GET /api/status
 * Get TTS engine status
 */
app.get('/api/status', async (c) => {
  try {
    const status = await tts.getStatus();
    
    return c.json({
      ...status,
      llmProvider: llm.getConfig(),
      success: true,
    });
  } catch (error) {
    console.error('Status endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status',
    }, 500);
  }
});

/**
 * POST /api/tts
 * Direct TTS endpoint - synthesize text without LLM
 */
app.post('/api/tts', async (c) => {
  try {
    const body = await c.req.json<{
      text: string;
      voice?: string;
      personality?: string;
      language?: string;
      sentiment?: string;
    }>();
    
    const { text, voice, personality, language, sentiment } = body;

    if (!text || typeof text !== 'string') {
      return c.json({
        success: false,
        error: 'Text is required',
      }, 400);
    }

    const ttsResult = await tts.speak({
      text,
      voice,
      personality,
      language,
      sentiment,
    });

    if (!ttsResult.success) {
      return c.json({
        success: false,
        error: ttsResult.error || 'TTS failed',
      }, 500);
    }

    const audioUrl = `/audio/${path.basename(ttsResult.audioPath)}`;

    return c.json({
      success: true,
      audioUrl,
      voice: ttsResult.voice,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

  } catch (error) {
    console.error('TTS endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'TTS failed',
    }, 500);
  }
});

/**
 * GET /api/personalities
 * List available personality presets
 */
app.get('/api/personalities', async (c) => {
  try {
    const projectRoot = findProjectRoot();
    const personalitiesDir = path.join(projectRoot, '.claude', 'personalities');
    
    const personalities: Array<{ name: string; description?: string }> = [];
    
    if (fs.existsSync(personalitiesDir)) {
      const files = fs.readdirSync(personalitiesDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const name = file.replace('.md', '');
          const content = fs.readFileSync(path.join(personalitiesDir, file), 'utf-8');
          // Extract first line as description
          const description = content.split('\n')[0]?.replace('#', '').trim();
          personalities.push({ name, description });
        }
      }
    }

    return c.json({
      personalities,
      success: true,
    });

  } catch (error) {
    console.error('Personalities endpoint error:', error);
    return c.json({
      personalities: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list personalities',
    }, 500);
  }
});

/**
 * POST /api/cleanup
 * Clean up old audio files
 */
app.post('/api/cleanup', async (c) => {
  try {
    const body = await c.req.json<{ maxAgeMinutes?: number }>();
    const maxAgeMinutes = body?.maxAgeMinutes || 60;

    const deletedCount = await tts.cleanup(maxAgeMinutes);

    return c.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old audio files`,
    });

  } catch (error) {
    console.error('Cleanup endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
    }, 500);
  }
});

/**
 * GET /api/nocodb/status
 * Check NocoDB connection status
 */
app.get('/api/nocodb/status', async (c) => {
  try {
    const configured = nocodb.isConfigured();
    const config = nocodb.getConfig();
    
    let connected = false;
    let tableCount = 0;
    let error = null;
    
    if (configured) {
      try {
        const tables = await nocodb.listTables();
        connected = true;
        tableCount = tables.length;
      } catch (e) {
        error = (e as Error).message;
      }
    }

    return c.json({
      success: true,
      configured,
      connected,
      config,
      tableCount,
      error,
    });
  } catch (error) {
    console.error('NocoDB status endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check NocoDB status',
    }, 500);
  }
});

/**
 * GET /api/nocodb/tables
 * List all tables in the NocoDB base
 */
app.get('/api/nocodb/tables', async (c) => {
  try {
    if (!nocodb.isConfigured()) {
      return c.json({
        success: false,
        error: 'NocoDB not configured. Check NOCODB_BASE_URL, NOCODB_API_TOKEN, and NOCODB_BASE_ID.',
      }, 503);
    }

    const tables = await nocodb.listTables();

    return c.json({
      success: true,
      tables,
      count: tables.length,
    });
  } catch (error) {
    console.error('NocoDB tables endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list tables',
    }, 500);
  }
});

/**
 * GET /api/nocodb/records/:tableId
 * List records from a specific table
 */
app.get('/api/nocodb/records/:tableId', async (c) => {
  try {
    if (!nocodb.isConfigured()) {
      return c.json({
        success: false,
        error: 'NocoDB not configured. Check NOCODB_BASE_URL, NOCODB_API_TOKEN, and NOCODB_BASE_ID.',
      }, 503);
    }

    const tableId = c.req.param('tableId');
    const query = c.req.query();
    
    const params: ListRecordsParams = {
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
      where: query.where,
      sort: query.sort,
      fields: query.fields,
    };

    const records = await nocodb.listRecords(tableId, params);

    return c.json({
      success: true,
      records,
      count: records.length,
      tableId,
    });
  } catch (error) {
    console.error('NocoDB records endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list records',
    }, 500);
  }
});

/**
 * POST /api/nocodb/records/:tableId
 * Create a new record in a table
 */
app.post('/api/nocodb/records/:tableId', async (c) => {
  try {
    if (!nocodb.isConfigured()) {
      return c.json({
        success: false,
        error: 'NocoDB not configured. Check NOCODB_BASE_URL, NOCODB_API_TOKEN, and NOCODB_BASE_ID.',
      }, 503);
    }

    const tableId = c.req.param('tableId');
    const data = await c.req.json<Record<string, any>>();

    const record = await nocodb.createRecord(tableId, data);

    return c.json({
      success: true,
      record,
      tableId,
    });
  } catch (error) {
    console.error('NocoDB create record endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create record',
    }, 500);
  }
});

/**
 * PATCH /api/nocodb/records/:tableId/:recordId
 * Update an existing record
 */
app.patch('/api/nocodb/records/:tableId/:recordId', async (c) => {
  try {
    if (!nocodb.isConfigured()) {
      return c.json({
        success: false,
        error: 'NocoDB not configured. Check NOCODB_BASE_URL, NOCODB_API_TOKEN, and NOCODB_BASE_ID.',
      }, 503);
    }

    const tableId = c.req.param('tableId');
    const recordId = c.req.param('recordId');
    const data = await c.req.json<Record<string, any>>();

    const record = await nocodb.updateRecord(tableId, recordId, data);

    return c.json({
      success: true,
      record,
      tableId,
      recordId,
    });
  } catch (error) {
    console.error('NocoDB update record endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update record',
    }, 500);
  }
});

/**
 * DELETE /api/nocodb/records/:tableId/:recordId
 * Delete a record
 */
app.delete('/api/nocodb/records/:tableId/:recordId', async (c) => {
  try {
    if (!nocodb.isConfigured()) {
      return c.json({
        success: false,
        error: 'NocoDB not configured. Check NOCODB_BASE_URL, NOCODB_API_TOKEN, and NOCODB_BASE_ID.',
      }, 503);
    }

    const tableId = c.req.param('tableId');
    const recordId = c.req.param('recordId');

    await nocodb.deleteRecord(tableId, recordId);

    return c.json({
      success: true,
      message: `Record ${recordId} deleted from table ${tableId}`,
      tableId,
      recordId,
    });
  } catch (error) {
    console.error('NocoDB delete record endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete record',
    }, 500);
  }
});

/**
 * GET /api/nocodb/search/:tableId
 * Search records in a table
 */
app.get('/api/nocodb/search/:tableId', async (c) => {
  try {
    if (!nocodb.isConfigured()) {
      return c.json({
        success: false,
        error: 'NocoDB not configured. Check NOCODB_BASE_URL, NOCODB_API_TOKEN, and NOCODB_BASE_ID.',
      }, 503);
    }

    const tableId = c.req.param('tableId');
    const query = c.req.query('q') || '';
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 10;

    const records = await nocodb.searchRecords(tableId, query, limit);

    return c.json({
      success: true,
      records,
      count: records.length,
      query,
      tableId,
    });
  } catch (error) {
    console.error('NocoDB search endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search records',
    }, 500);
  }
});

/**
 * GET /audio/*
 * Serve audio files from the audio directory
 */
app.get('/audio/*', async (c) => {
  const audioPath = c.req.path.replace('/audio/', '');
  const audioDir = tts.getAudioDir();
  const filePath = path.join(audioDir, path.basename(audioPath));

  // Security: only serve files from the audio directory
  if (!filePath.startsWith(audioDir)) {
    return c.json({ error: 'Invalid path' }, 403);
  }

  if (!fs.existsSync(filePath)) {
    return c.json({ error: 'Audio file not found' }, 404);
  }

  const file = fs.readFileSync(filePath);
  const mimeType = filePath.endsWith('.mp3') 
    ? 'audio/mpeg' 
    : filePath.endsWith('.wav') 
      ? 'audio/wav' 
      : 'audio/octet-stream';

  return new Response(file, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

/**
 * Static file serving for frontend (only if public directory exists)
 */
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use('/*', serveStatic({ root: publicDir }));
}

/**
 * Default route - serve the main page (index.html from public directory)
 */
app.get('/', (c) => {
  const publicDir = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicDir, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    return c.html(content);
  }
  
  // Fallback if index.html doesn't exist
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgentVibes Web Voice Chat</title>
</head>
<body style="background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
    <div style="text-align:center;">
        <h1>🎤 AgentVibes Web Voice Chat</h1>
        <p>Frontend not found. Please create public/index.html</p>
        <p>API is running at <a href="/api/status" style="color:#e94560;">/api/status</a></p>
    </div>
</body>
</html>
  `);
});

// Helper function to find project root
function findProjectRoot(): string {
  if (process.env.AGENTVIBES_ROOT) {
    return process.env.AGENTVIBES_ROOT;
  }

  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '.claude'))) {
    return cwd;
  }

  let currentDir = __dirname;
  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, '.claude'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  const homeDir = os.homedir();
  const homeClaude = path.join(homeDir, '.claude');
  if (fs.existsSync(homeClaude)) {
    return homeDir;
  }

  return homeDir;
}

// Export for both Node.js and Cloudflare Workers
export default app;

// Node.js server entry point (for local development)
const port = process.env.PORT || 3000;

// Import and start the Node.js server
import { serve } from '@hono/node-server';

serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`🎤 AgentVibes Web Server running on http://localhost:${port}`);
console.log(`📡 API endpoints:`);
console.log(`   POST /api/chat                - Chat with voice response`);
console.log(`   GET  /api/voices              - List available voices`);
console.log(`   POST /api/voice               - Set active voice`);
console.log(`   GET  /api/status              - Get TTS/LLM status`);
console.log(`   GET  /api/nocodb/status       - Check NocoDB connection`);
console.log(`   GET  /api/nocodb/tables       - List NocoDB tables`);
console.log(`   GET  /api/nocodb/records/:id  - List records from table`);
console.log(`   POST /api/nocodb/records/:id  - Create record in table`);
console.log(`   GET  /api/nocodb/search/:id   - Search records in table`);
console.log(`🔗 NocoDB: ${process.env.NOCODB_BASE_URL || 'not configured'}`);
console.log(`📊 Tables: Social Posts, Social Posts - AI, YouTube Content Pipeline`);
