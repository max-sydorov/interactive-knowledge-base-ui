import { KnowledgeGraph, KnowledgeNode } from '@/types/knowledge';
import { mockGraph } from '@/data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiService {
  private async fetchWithErrorHandling<T>(url: string, fallback?: T): Promise<T> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('API Error, using mock data:', error);
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  async getKnowledgeGraph(service?: string, flow?: string): Promise<KnowledgeGraph> {
    const params = new URLSearchParams();
    if (service && service !== 'all') {
      params.append('service', service);
    }
    if (flow && flow !== 'all') {
      params.append('flow', flow);
    }
    
    const queryString = params.toString();
    const url = queryString 
      ? `${API_BASE_URL}/knowledge-graph?${queryString}`
      : `${API_BASE_URL}/knowledge-graph`;
    
    return this.fetchWithErrorHandling<KnowledgeGraph>(
      url,
      mockGraph
    );
  }

  async getNode(nodeId: string): Promise<KnowledgeNode | null> {
    try {
      const result = await this.fetchWithErrorHandling<KnowledgeNode>(
        `${API_BASE_URL}/nodes/${nodeId}`
      );
      return result;
    } catch (error) {
      // Fallback to mock data
      const node = mockGraph.nodes.find(n => n.id === nodeId);
      return node || null;
    }
  }

  async getServices(): Promise<string[]> {
    try {
      return await this.fetchWithErrorHandling<string[]>(`${API_BASE_URL}/services`);
    } catch (error) {
      // Extract unique services from mock data
      const serviceSet = new Set(mockGraph.nodes.map(node => node.service));
      return Array.from(serviceSet).sort();
    }
  }

  async getFlows(): Promise<Array<{ value: string; label: string }>> {
    try {
      return await this.fetchWithErrorHandling<Array<{ value: string; label: string }>>(`${API_BASE_URL}/flows`);
    } catch (error) {
      // Return default flows
      return [
        { value: 'all', label: 'All flows' },
        { value: 'merchant-intake', label: 'Merchant Application Intake Experience' },
        { value: 'basic-info', label: 'Basic Info flow' }
      ];
    }
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
      console.error('Failed to ask question, will use mock response:', error);
      // Return null to trigger mock response in components
      return null;
    }
  }
}

export const apiService = new ApiService();