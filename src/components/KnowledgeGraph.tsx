import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';
import { KnowledgeGraph as GraphType, KnowledgeNode, KnowledgeLink } from '@/types/knowledge';

interface KnowledgeGraphProps {
  data: GraphType;
  selectedService?: string;
  highlightNodeId?: string; // For highlighting a specific node
  height?: number;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ 
  data, 
  selectedService,
  highlightNodeId,
  height = 600 
}) => {
  const navigate = useNavigate();
  const graphRef = useRef<any>();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Configure force simulation to increase distance between nodes
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('link').distance(75);
      graphRef.current.d3Force('charge').strength(-250);
      // Set up DAG positioning
      graphRef.current.d3Force('x').strength(0.3);
      graphRef.current.d3Force('y').strength(0.1);
    }
  }, [data]);

  // Data is already filtered by the API, no client-side filtering needed
  const filteredData = data;

  const getNodeColor = useCallback((node: KnowledgeNode) => {
    // Highlight the specific node if provided
    if (highlightNodeId && node.id === highlightNodeId) {
      return '#FFD700'; // Gold color for highlighted node
    }
    
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
  }, [highlightNodeId]);

  const handleNodeClick = useCallback((node: any) => {
    navigate(`/node/${node.id}`);
  }, [navigate]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Draw glow effect
    ctx.shadowColor = getNodeColor(node);
    ctx.shadowBlur = 20;
    
    // Draw node circle (slightly larger on hover)
    const nodeRadius = hoveredNode === node.id ? 10 : 8;
    ctx.fillStyle = getNodeColor(node);
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Reset shadow for text
    ctx.shadowBlur = 0;
    
    // Draw node details based on hover state
    if (hoveredNode === node.id) {
      // On hover: show detailed info
      const fontSize = 12 / globalScale;
      const detailFontSize = 10 / globalScale;
      
      // Node name
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameWidth = ctx.measureText(node.name).width;
      
      // Background for name
      ctx.fillStyle = 'rgba(4, 7, 20, 0.95)';
      ctx.fillRect(
        node.x - nameWidth / 2 - 8,
        node.y + 20,
        nameWidth + 16,
        fontSize + 10
      );
      
      // Name text
      ctx.fillStyle = '#fff';
      ctx.fillText(node.name, node.x, node.y + 20 + fontSize / 2 + 5);
      
      // Service and Type
      ctx.font = `${detailFontSize}px Inter, sans-serif`;
      
      // Service text
      const serviceText = `Service: ${node.service}`;
      const serviceWidth = ctx.measureText(serviceText).width;
      
      // Background for service
      ctx.fillStyle = 'rgba(4, 7, 20, 0.95)';
      ctx.fillRect(
        node.x - serviceWidth / 2 - 6,
        node.y + 40,
        serviceWidth + 12,
        detailFontSize + 6
      );
      
      // Service text
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(serviceText, node.x, node.y + 40 + detailFontSize / 2 + 3);
      
      // Type text
      const typeText = `Type: ${node.type.charAt(0).toUpperCase() + node.type.slice(1)}`;
      const typeWidth = ctx.measureText(typeText).width;
      
      // Background for type
      ctx.fillStyle = 'rgba(4, 7, 20, 0.95)';
      ctx.fillRect(
        node.x - typeWidth / 2 - 6,
        node.y + 55,
        typeWidth + 12,
        detailFontSize + 6
      );
      
      // Type text with node color
      ctx.fillStyle = getNodeColor(node);
      ctx.fillText(typeText, node.x, node.y + 55 + detailFontSize / 2 + 3);
    } else {
      // Not hovering: show simple label
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      const textWidth = ctx.measureText(node.name).width;
      const bckgDimensions = [textWidth + 10, fontSize + 8];
      
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
      ctx.fillText(node.name, node.x, node.y + 12 + fontSize / 2 + 4);
    }
  }, [getNodeColor, hoveredNode]);

  const drawLinkArrow = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;
    
    if (!start.x || !start.y || !end.x || !end.y) return;

    // Calculate arrow position at the edge of target node (accounting for node radius)
    const nodeRadius = 8;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and calculate arrow position at edge of target node
    const normX = dx / distance;
    const normY = dy / distance;
    const arrowX = end.x - normX * nodeRadius;
    const arrowY = end.y - normY * nodeRadius;
    
    // Calculate arrow angle
    const angle = Math.atan2(dy, dx);
    
    // Arrow size (narrower)
    const arrowLength = 8 / Math.sqrt(globalScale);
    const arrowWidth = 3 / Math.sqrt(globalScale);
    
    // Draw arrow
    ctx.save();
    ctx.translate(arrowX, arrowY);
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
      // Calculate midpoint for text position
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      
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
        onNodeHover={(node: any) => {
          setHoveredNode(node ? node.id : null);
        }}
        nodeLabel={() => ''}
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
        cooldownTime={3000}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.2}
        dagMode={'lr'}
        dagLevelDistance={150}
        dagNodeFilter={(node: any) => true}
      />
      
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