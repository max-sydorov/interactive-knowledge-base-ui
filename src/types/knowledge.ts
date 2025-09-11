export type NodeType = 'ui' | 'api' | 'database';

export interface KnowledgeNode {
  id: string;
  name: string;
  type: NodeType;
  service: string;
  description: string;
  sourceFiles: string[];
  x?: number;
  y?: number;
}

export interface KnowledgeLink {
  source: string;
  target: string;
  type?: 'upstream' | 'downstream';
  relationshipType?: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

export interface LLMContext {
  mode: 'node-only' | 'node-and-downstream';
  nodeId: string;
}