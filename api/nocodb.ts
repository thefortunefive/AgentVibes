/**
 * NocoDB Client
 *
 * REST API client for NocoDB operations
 * Docs: https://docs.nocodb.com/developer-resources/rest-apis/
 */

export interface NocoDBTable {
  id: string;
  title: string;
  table_name: string;
  type: string;
}

export interface NocoDBRecord {
  Id: string;
  [key: string]: any;
}

export interface ListRecordsParams {
  limit?: number;
  offset?: number;
  where?: string;
  sort?: string;
  fields?: string;
}

export interface NocoDBConfig {
  baseUrl: string;
  apiToken: string;
  baseId: string;
}

export class NocoDBClient {
  private config: NocoDBConfig;

  constructor(config?: Partial<NocoDBConfig>) {
    this.config = {
      baseUrl: process.env.NOCODB_BASE_URL || 'http://localhost:8080',
      apiToken: process.env.NOCODB_API_TOKEN || '',
      baseId: process.env.NOCODB_BASE_ID || '',
      ...config,
    };

    if (!this.config.apiToken) {
      console.warn('⚠️  NOCODB_API_TOKEN not configured');
    }
    if (!this.config.baseId) {
      console.warn('⚠️  NOCODB_BASE_ID not configured');
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'xc-token': this.config.apiToken,
    };
  }

  /**
   * Build URL with base URL
   */
  private buildUrl(path: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    return `${baseUrl}${path}`;
  }

  /**
   * List all tables in the base
   */
  async listTables(): Promise<NocoDBTable[]> {
    if (!this.config.baseId) {
      throw new Error('NOCODB_BASE_ID not configured');
    }

    const url = this.buildUrl(`/api/v2/meta/bases/${this.config.baseId}/tables`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NocoDB list tables error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { list: NocoDBTable[] };
    return data.list || [];
  }

  /**
   * List records from a table
   */
  async listRecords(tableId: string, params?: ListRecordsParams): Promise<NocoDBRecord[]> {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));
    if (params?.where) queryParams.set('where', params.where);
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.fields) queryParams.set('fields', params.fields);

    const queryString = queryParams.toString();
    const url = this.buildUrl(`/api/v2/tables/${tableId}/records${queryString ? `?${queryString}` : ''}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NocoDB list records error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { list: NocoDBRecord[] };
    return data.list || [];
  }

  /**
   * Get a single record by ID
   */
  async getRecord(tableId: string, recordId: string): Promise<NocoDBRecord | null> {
    const url = this.buildUrl(`/api/v2/tables/${tableId}/records/${recordId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NocoDB get record error: ${response.status} - ${error}`);
    }

    return await response.json() as NocoDBRecord;
  }

  /**
   * Create a new record
   */
  async createRecord(tableId: string, data: Record<string, any>): Promise<NocoDBRecord> {
    const url = this.buildUrl(`/api/v2/tables/${tableId}/records`);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NocoDB create record error: ${response.status} - ${error}`);
    }

    return await response.json() as NocoDBRecord;
  }

  /**
   * Update an existing record
   */
  async updateRecord(tableId: string, recordId: string, data: Record<string, any>): Promise<NocoDBRecord> {
    const url = this.buildUrl(`/api/v2/tables/${tableId}/records`);

    const body = {
      Id: recordId,
      ...data,
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NocoDB update record error: ${response.status} - ${error}`);
    }

    return await response.json() as NocoDBRecord;
  }

  /**
   * Delete a record
   */
  async deleteRecord(tableId: string, recordId: string): Promise<boolean> {
    const url = this.buildUrl(`/api/v2/tables/${tableId}/records/${recordId}`);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NocoDB delete record error: ${response.status} - ${error}`);
    }

    return true;
  }

  /**
   * Search records using a query string (searches text fields)
   */
  async searchRecords(tableId: string, query: string, limit: number = 10): Promise<NocoDBRecord[]> {
    // Get table info to find text fields
    const tables = await this.listTables();
    const table = tables.find(t => t.id === tableId || t.title === tableId);

    if (!table) {
      throw new Error(`Table not found: ${tableId}`);
    }

    // For now, use a generic search with 'where' clause on common text fields
    // NocoDB uses a special syntax for searching: (field,like,value)
    const searchWhere = `(Title,like,${query})`;

    return await this.listRecords(tableId, {
      where: searchWhere,
      limit,
    });
  }

  /**
   * Get current configuration (sanitized)
   */
  getConfig(): Omit<NocoDBConfig, 'apiToken'> {
    const { apiToken, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.apiToken && this.config.baseId);
  }
}

// Singleton instance
let defaultClient: NocoDBClient | null = null;

export function getNocoDBClient(): NocoDBClient {
  if (!defaultClient) {
    defaultClient = new NocoDBClient();
  }
  return defaultClient;
}

export function resetNocoDBClient(): void {
  defaultClient = null;
}

export default NocoDBClient;
