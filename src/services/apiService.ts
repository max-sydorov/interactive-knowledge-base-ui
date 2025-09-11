import { KnowledgeGraph, KnowledgeNode } from '@/types/knowledge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiService {
  private async fetchWithErrorHandling<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getKnowledgeGraph(): Promise<KnowledgeGraph> {
    return this.fetchWithErrorHandling<KnowledgeGraph>(`${API_BASE_URL}/knowledge-graph`);
  }

  async getNode(nodeId: string): Promise<KnowledgeNode | null> {
    try {
      return await this.fetchWithErrorHandling<KnowledgeNode>(`${API_BASE_URL}/nodes/${nodeId}`);
    } catch (error) {
      console.error(`Failed to fetch node ${nodeId}:`, error);
      return null;
    }
  }

  async getServices(): Promise<string[]> {
    return this.fetchWithErrorHandling<string[]>(`${API_BASE_URL}/services`);
  }

  async getFlows(): Promise<Array<{ value: string; label: string }>> {
    return this.fetchWithErrorHandling<Array<{ value: string; label: string }>>(`${API_BASE_URL}/flows`);
  }

  async askQuestion(question: string, context?: { nodeId?: string; mode?: string }): Promise<ReadableStream<Uint8Array> | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.body;
    } catch (error) {
      console.error('Failed to ask question:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();