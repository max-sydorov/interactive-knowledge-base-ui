import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, FileCode, MessageSquare, ChevronRight, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiService } from '@/services/apiService';
import { KnowledgeNode, KnowledgeGraph } from '@/types/knowledge';
import { useToast } from '@/hooks/use-toast';
import KnowledgeGraphComponent from '@/components/KnowledgeGraph';
import { FeedbackSection } from '@/components/FeedbackSection';


const NodeDetails: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [question, setQuestion] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [node, setNode] = useState<KnowledgeNode | null>(null);
  const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionUuid, setCurrentQuestionUuid] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!nodeId) return;
      
      try {
        setIsLoading(true);
        const [nodeData, graph] = await Promise.all([
          apiService.getNode(nodeId),
          apiService.getKnowledgeGraph(undefined, undefined, nodeId) // Pass nodeId to get filtered graph
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

  // Load saved question from URL only on initial page load
  useEffect(() => {
    const questionUuid = searchParams.get('question_uuid');
    if (questionUuid) {
      setCurrentQuestionUuid(questionUuid);
      const loadAnswer = async () => {
        const savedAnswer = await apiService.getAnswer(questionUuid);
        if (savedAnswer) {
          setQuestion(savedAnswer.question);
          setLlmResponse(savedAnswer.answer);
        }
      };
      loadAnswer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    // Generate unique question UUID
    const questionUuid = crypto.randomUUID();
    setCurrentQuestionUuid(questionUuid);
    
    // Update URL with question UUID
    const newParams = new URLSearchParams(searchParams);
    newParams.set('question_uuid', questionUuid);
    setSearchParams(newParams);
    
    setIsThinking(true);
    setLlmResponse('');
    
    try {
      const stream = await apiService.askQuestion(question, { 
        nodeId: nodeId,
        questionUuid
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
        const mockAnswer = `Here's information about "${question}":\n\nThis is a mock streaming response. In a real implementation, this would stream from the server.`;
        
        // Stream answer phase
        for (let i = 0; i <= mockAnswer.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          setLlmResponse(mockAnswer.slice(0, i));
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
              <span className="glass-card px-3 py-1 rounded-full capitalize">{node.type}</span>
              <span className="glass-card px-3 py-1 rounded-full">{node.service}</span>
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
            {graphData ? (
              <KnowledgeGraphComponent 
                data={graphData}
                highlightNodeId={nodeId}
                height={500}
              />
            ) : (
              <div className="flex justify-center items-center h-[500px]">
                <div className="text-muted-foreground">No graph data available</div>
              </div>
            )}
          </div>

          {/* Overview Section */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
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
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-primary" />
                  <span className="text-sm font-mono">{file}</span>
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
                placeholder={`Ask a question about ${node.name}...`}
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

              {/* Answer Section */}
              {(isThinking || llmResponse) && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  {isThinking && !llmResponse && (
                    <p className="text-sm text-muted-foreground animate-pulse">Generating answer...</p>
                  )}
                  {llmResponse && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-xl font-bold mt-4 mb-3">{children}</h1>,
                          h2: ({children}) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-base font-medium mt-2 mb-1">{children}</h3>,
                          code: ({children, ...props}: any) => {
                            const isInline = !props.className;
                            return isInline ? (
                              <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-sm">{children}</code>
                            ) : (
                              <code className="block p-3 rounded-lg bg-muted/50 text-sm overflow-x-auto">{children}</code>
                            );
                          },
                          pre: ({children}) => <pre className="bg-muted/50 rounded-lg overflow-x-auto">{children}</pre>,
                          ul: ({children}) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-sm">{children}</li>,
                          p: ({children}) => <p className="text-sm mb-2">{children}</p>,
                        }}
                      >
                        {llmResponse}
                      </ReactMarkdown>
                    </div>
                  )}
                  {llmResponse && currentQuestionUuid && (
                    <FeedbackSection questionUuid={currentQuestionUuid} />
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