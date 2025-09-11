import React, { useRef, useCallback, useMemo, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';
import { KnowledgeGraph as GraphType, KnowledgeNode, KnowledgeLink } from '@/types/knowledge';

interface KnowledgeGraphProps {
  data: GraphType;
  selectedService?: string;
  height?: number;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ 
  data, 
  selectedService,
  height = 600 
}) => {
  const navigate = useNavigate();
  const graphRef = useRef<any>();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!selectedService || selectedService === 'all') {
      return data;
    }
    
    const filteredNodes = data.nodes.filter(node => node.service === selectedService);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = data.links.filter(
      link => nodeIds.has(link.source as string) || nodeIds.has(link.target as string)
    );
    
    // Include connected nodes even if from different service
    filteredLinks.forEach(link => {
      const sourceNode = data.nodes.find(n => n.id === link.source);
      const targetNode = data.nodes.find(n => n.id === link.target);
      if (sourceNode && !nodeIds.has(sourceNode.id)) {
        filteredNodes.push(sourceNode);
        nodeIds.add(sourceNode.id);
      }
      if (targetNode && !nodeIds.has(targetNode.id)) {
        filteredNodes.push(targetNode);
        nodeIds.add(targetNode.id);
      }
    });
    
    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [data, selectedService]);

  const getNodeColor = useCallback((node: KnowledgeNode) => {
    switch (node.type) {
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

  const handleNodeClick = useCallback((node: any) => {
    navigate(`/node/${node.id}`);
  }, [navigate]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Inter, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth + 10, fontSize + 8];

    // Draw glow effect
    ctx.shadowColor = getNodeColor(node);
    ctx.shadowBlur = 20;
    
    // Draw node circle
    ctx.fillStyle = getNodeColor(node);
    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Reset shadow for text
    ctx.shadowBlur = 0;
    
    // Draw label background
    ctx.fillStyle = 'rgba(4, 7, 20, 0.9)';
    ctx.fillRect(
      node.x - bckgDimensions[0] / 2,
      node.y + 12,
      bckgDimensions[0],
      bckgDimensions[1]
    );
    
    // Draw label text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(label, node.x, node.y + 12 + fontSize / 2 + 4);
  }, [getNodeColor]);

  const drawLinkArrow = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;
    
    if (!start.x || !start.y || !end.x || !end.y) return;

    // Calculate arrow position (midpoint)
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    // Calculate arrow angle
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    // Arrow size
    const arrowLength = 10 / Math.sqrt(globalScale);
    const arrowWidth = 6 / Math.sqrt(globalScale);
    
    // Draw arrow
    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);
    
    ctx.fillStyle = hoveredLink === `${link.source.id}-${link.target.id}` 
      ? 'rgba(255, 255, 255, 0.9)' 
      : 'rgba(100, 116, 139, 0.6)';
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLength, -arrowWidth);
    ctx.lineTo(-arrowLength, arrowWidth);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Draw relationship type on hover
    if (hoveredLink === `${link.source.id}-${link.target.id}` && link.relationshipType) {
      const fontSize = 11 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      const textWidth = ctx.measureText(link.relationshipType).width;
      
      // Background for text
      ctx.fillStyle = 'rgba(4, 7, 20, 0.95)';
      ctx.fillRect(
        midX - textWidth / 2 - 6,
        midY - fontSize / 2 - 6,
        textWidth + 12,
        fontSize + 12
      );
      
      // Relationship text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.relationshipType, midX, midY);
    }
  }, [hoveredLink]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden glass-card">
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredData}
        width={window.innerWidth - 100}
        height={height}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 10, 0, 2 * Math.PI);
          ctx.fill();
        }}
        onNodeClick={handleNodeClick}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={drawLinkArrow}
        linkColor={() => hoveredLink ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.3)'}
        linkWidth={2}
        linkDirectionalArrowLength={0} // We draw custom arrows
        onLinkHover={(link: any) => {
          if (link) {
            setHoveredLink(`${link.source.id}-${link.target.id}`);
          } else {
            setHoveredLink(null);
          }
        }}
        linkPointerAreaPaint={(link, color, ctx) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(link.source.x!, link.source.y!);
          ctx.lineTo(link.target.x!, link.target.y!);
          ctx.stroke();
        }}
        backgroundColor="transparent"
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        cooldownTime={1000}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 p-3 glass-card rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00D9FF] node-glow-ui"></div>
          <span className="text-xs text-muted-foreground">UI Page</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#B833FF] node-glow-api"></div>
          <span className="text-xs text-muted-foreground">API Endpoint</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3B82F6] node-glow-database"></div>
          <span className="text-xs text-muted-foreground">Database</span>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;