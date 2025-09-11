import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ForceGraph2D from 'react-force-graph-2d';
import { ArrowLeft, FileCode, MessageSquare, ChevronRight, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiService } from '@/services/apiService';
import { KnowledgeNode, KnowledgeGraph } from '@/types/knowledge';
import { useToast } from '@/hooks/use-toast';

const NodeDetails: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [node, setNode] = useState<KnowledgeNode | null>(null);
  const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!nodeId) return;
      
      try {
        setIsLoading(true);
        const [nodeData, graph] = await Promise.all([
          apiService.getNode(nodeId),
          apiService.getKnowledgeGraph()
        ]);
        
        setNode(nodeData);
        setGraphData(graph);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: "Error",
          description: "Failed to load node data from server",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [nodeId, toast]);

  const relatedGraph = useMemo(() => {
    if (!node || !graphData) return { nodes: [], links: [] };

    const relatedNodes = new Set<string>([node.id]);
    const relatedLinks = [];

    // Find upstream nodes (nodes that link to this node)
    graphData.links.forEach(link => {
      if (link.target === node.id) {
        const sourceNode = graphData.nodes.find(n => n.id === link.source);
        if (sourceNode) {
          relatedNodes.add(sourceNode.id);
          relatedLinks.push({ ...link, type: 'upstream' });
        }
      }
    });

    // Find downstream nodes (nodes this node links to)
    graphData.links.forEach(link => {
      if (link.source === node.id) {
        const targetNode = graphData.nodes.find(n => n.id === link.target);
        if (targetNode) {
          relatedNodes.add(targetNode.id);
          relatedLinks.push({ ...link, type: 'downstream' });
        }
      }
    });

    const nodes = graphData.nodes.filter(n => relatedNodes.has(n.id));
    
    return { nodes, links: relatedLinks };
  }, [node, nodeId, graphData]);

  const getNodeColor = useCallback((graphNode: KnowledgeNode) => {
    if (graphNode.id === nodeId) return '#FFD700';
    switch (graphNode.type) {
      case 'ui':
        return '#00D9FF';
      case 'api':
        return '#B833FF';
      case 'database':
        return '#3B82F6';
      default:
        return '#666';
    }
  }, [nodeId]);

  const paintNode = useCallback((graphNode: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = graphNode.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Inter, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth + 10, fontSize + 8];

    // Draw glow effect for current node
    if (graphNode.id === nodeId) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 30;
    } else {
      ctx.shadowColor = getNodeColor(graphNode);
      ctx.shadowBlur = 15;
    }
    
    // Draw node circle
    ctx.fillStyle = getNodeColor(graphNode);
    ctx.beginPath();
    ctx.arc(graphNode.x, graphNode.y, graphNode.id === nodeId ? 10 : 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Reset shadow for text
    ctx.shadowBlur = 0;
    
    // Draw label background
    ctx.fillStyle = 'rgba(4, 7, 20, 0.9)';
    ctx.fillRect(
      graphNode.x - bckgDimensions[0] / 2,
      graphNode.y + 12,
      bckgDimensions[0],
      bckgDimensions[1]
    );
    
    // Draw label text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = graphNode.id === nodeId ? '#FFD700' : '#fff';
    ctx.fillText(label, graphNode.x, graphNode.y + 12 + fontSize / 2 + 4);
  }, [getNodeColor, nodeId]);

  const drawLinkArrow = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;
    
    if (!start.x || !start.y || !end.x || !end.y) return;

    // Calculate arrow position (closer to target)
    const t = 0.7; // Position along the line (0.7 = 70% towards target)
    const arrowX = start.x + (end.x - start.x) * t;
    const arrowY = start.y + (end.y - start.y) * t;
    
    // Calculate arrow angle
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    // Arrow size
    const arrowLength = 8 / Math.sqrt(globalScale);
    const arrowWidth = 5 / Math.sqrt(globalScale);
    
    // Draw arrow
    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    
    const isHovered = hoveredLink === `${link.source.id}-${link.target.id}`;
    ctx.fillStyle = link.type === 'upstream' 
      ? (isHovered ? 'rgba(0, 217, 255, 0.9)' : 'rgba(0, 217, 255, 0.6)')
      : (isHovered ? 'rgba(184, 51, 255, 0.9)' : 'rgba(184, 51, 255, 0.6)');
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLength, -arrowWidth);
    ctx.lineTo(-arrowLength, arrowWidth);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Draw relationship type on hover
    if (isHovered && link.relationshipType) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      const textWidth = ctx.measureText(link.relationshipType).width;
      
      // Background for text
      ctx.fillStyle = 'rgba(4, 7, 20, 0.95)';
      ctx.fillRect(
        midX - textWidth / 2 - 5,
        midY - fontSize / 2 - 5,
        textWidth + 10,
        fontSize + 10
      );
      
      // Relationship text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.relationshipType, midX, midY);
    }
  }, [hoveredLink]);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    setIsThinking(true);
    setLlmResponse('');
    
    try {
      const stream = await apiService.askQuestion(question, { 
        nodeId: nodeId,
        mode: 'node-and-downstream'
      });
      
      if (stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          setLlmResponse(prev => prev + chunk);
        }
      } else {
        // Fallback to mock response if streaming fails
        const mockResponse = `Here's information about "${question}":\n\nThis is a mock streaming response. In a real implementation, this would stream from the server.`;
        
        for (let i = 0; i <= mockResponse.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 20));
          setLlmResponse(mockResponse.slice(0, i));
        }
      }
    } catch (error) {
      console.error('Failed to ask question:', error);
      toast({
        title: "Error",
        description: "Failed to get response from server",
        variant: "destructive"
      });
    } finally {
      setIsThinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <p className="text-muted-foreground">Fetching node data from server</p>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Node not found</h2>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Graph
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                size="sm"
                className="hover-glow"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  node.type === 'ui' ? 'bg-[#00D9FF] node-glow-ui' :
                  node.type === 'api' ? 'bg-[#B833FF] node-glow-api' :
                  'bg-[#3B82F6] node-glow-database'
                }`}></div>
                <h1 className="text-2xl font-bold gradient-text">{node.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="glass-card px-3 py-1 rounded-full">{node.service}</span>
              <span className="glass-card px-3 py-1 rounded-full capitalize">{node.type}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Relationships Section */}
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Relationships</h2>
            </div>
            <div className="rounded-lg overflow-hidden">
              <ForceGraph2D
                graphData={relatedGraph}
                width={window.innerWidth - 100}
                height={500}
                nodeCanvasObject={paintNode}
                linkCanvasObjectMode={() => 'after'}
                linkCanvasObject={drawLinkArrow}
                onNodeClick={(clickedNode: any) => {
                  if (clickedNode.id !== nodeId) {
                    navigate(`/node/${clickedNode.id}`);
                  }
                }}
                linkColor={(link: any) => {
                  const isHovered = hoveredLink === `${link.source.id}-${link.target.id}`;
                  return link.type === 'upstream' 
                    ? (isHovered ? 'rgba(0, 217, 255, 0.5)' : 'rgba(0, 217, 255, 0.3)')
                    : (isHovered ? 'rgba(184, 51, 255, 0.5)' : 'rgba(184, 51, 255, 0.3)');
                }}
                linkWidth={2}
                linkDirectionalArrowLength={0}
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
              />
            </div>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00D9FF]"></div>
                <span className="text-xs text-muted-foreground">Upstream</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B833FF]"></div>
                <span className="text-xs text-muted-foreground">Downstream</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#FFD700]"></div>
                <span className="text-xs text-muted-foreground">Current</span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({children}) => <h1 className="text-2xl font-bold mt-6 mb-4 gradient-text">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-semibold mt-4 mb-3">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-medium mt-3 mb-2">{children}</h3>,
                  code: ({children, ...props}: any) => {
                    const isInline = !props.className;
                    return isInline ? (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-sm">{children}</code>
                    ) : (
                      <code className="block p-4 rounded-lg bg-muted/50 text-sm overflow-x-auto">{children}</code>
                    );
                  },
                  pre: ({children}) => <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto">{children}</pre>,
                  ul: ({children}) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                  li: ({children}) => <li className="text-muted-foreground">{children}</li>,
                }}
              >
                {node.description}
              </ReactMarkdown>
            </div>
          </div>

          {/* Source Files Section */}
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <FileCode className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Source Files</h2>
            </div>
            <div className="space-y-2">
              {node.sourceFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <code className="text-sm font-mono text-primary">{file}</code>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>

          {/* Ask a Question Section */}
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Ask a Question</h2>
            </div>
            
            <div className="space-y-4">
              <Textarea
                placeholder="Ask anything about this node..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[100px] bg-input/50 border-border/50 resize-none"
              />

              <Button 
                onClick={handleAskQuestion}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                disabled={!question.trim() || isThinking}
                size="lg"
              >
                {isThinking ? 'Thinking...' : 'Submit'}
              </Button>

              {(isThinking || llmResponse) && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  {isThinking && !llmResponse && (
                    <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
                  )}
                  {llmResponse && (
                    <p className="text-sm whitespace-pre-wrap">{llmResponse}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NodeDetails;