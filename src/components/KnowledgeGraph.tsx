import React, { useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactFlow } from '@xyflow/react';
import {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { KnowledgeGraph as GraphType, KnowledgeNode, KnowledgeLink } from '@/types/knowledge';

interface KnowledgeGraphProps {
  data: GraphType;
  selectedService?: string;
  highlightNodeId?: string;
  height?: number;
}

// Custom node component
const CustomNode: React.FC<NodeProps<any>> = ({ data, selected }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'ui':
        return '#00D9FF';
      case 'api':
        return '#B833FF';
      case 'database':
        return '#3B82F6';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const nodeColor = data.isHighlighted ? '#FFD700' : getNodeColor(data.type as string);

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
        data.isHighlighted ? 'ring-4 ring-yellow-400/30 scale-110' : ''
      } ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{
        backgroundColor: `${nodeColor}20`,
        borderColor: nodeColor,
        minWidth: '120px',
        boxShadow: `0 0 20px ${nodeColor}80`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="text-center">
        <div className="font-semibold text-sm text-white">
          {data.label as string}
        </div>
        {data.service && (
          <div className="text-xs text-muted-foreground mt-1">{data.service as string}</div>
        )}
        <div className="text-xs" style={{ color: nodeColor }}>
          {data.displayType as string}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  selectedService,
  highlightNodeId,
  height = 600,
}) => {
  const navigate = useNavigate();

  // Convert data to React Flow format
  const { flowNodes, flowEdges } = useMemo(() => {
    const nodes: Node[] = data.nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / data.nodes.length;
      const radius = 250;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      return {
        id: node.id,
        type: 'custom',
        position: { x, y },
        data: {
          label: node.name,
          type: node.type,
          service: node.service,
          displayType: node.type === 'ui' ? 'UI View' : 
                       node.type === 'api' ? 'API Endpoint' : 
                       node.type === 'database' ? 'Database Table' : 
                       (node.type as string).charAt(0).toUpperCase() + (node.type as string).slice(1),
          isHighlighted: highlightNodeId === node.id,
          originalNode: node,
        },
      };
    });

    const edges: Edge[] = data.links.map((link) => ({
      id: `${link.source}-${link.target}`,
      source: link.source,
      target: link.target,
      label: link.relationshipType,
      labelStyle: { fontSize: 10, fontWeight: 500, fill: '#fff' },
      labelBgStyle: { fill: 'rgba(4, 7, 20, 0.95)', fillOpacity: 0.9 },
      animated: selectedService ? 
        (data.nodes.find(n => n.id === link.source)?.service === selectedService ||
         data.nodes.find(n => n.id === link.target)?.service === selectedService) : false,
      style: {
        stroke: 'rgba(100, 116, 139, 0.6)',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: 'rgba(100, 116, 139, 0.6)',
      },
    }));

    return { flowNodes: nodes, flowEdges: edges };
  }, [data, selectedService, highlightNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    navigate(`/node/${node.id}`);
  }, [navigate]);

  const nodeColor = useCallback((node: Node) => {
    if (node.data.isHighlighted) return '#FFD700';
    switch (node.data.type) {
      case 'ui':
        return '#00D9FF';
      case 'api':
        return '#B833FF';
      case 'database':
        return '#3B82F6';
      default:
        return '#666';
    }
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden glass-card" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-transparent"
      >
        <Background color="rgba(100, 116, 139, 0.1)" gap={16} size={0.5} />
        <Controls className="bg-card border border-border" />
        <MiniMap 
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          pannable
          zoomable
          className="bg-card border border-border"
        />
      </ReactFlow>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 p-3 glass-card rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00D9FF] node-glow-ui"></div>
          <span className="text-xs text-muted-foreground">UI View</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#B833FF] node-glow-api"></div>
          <span className="text-xs text-muted-foreground">API Endpoint</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3B82F6] node-glow-database"></div>
          <span className="text-xs text-muted-foreground">Database Table</span>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;