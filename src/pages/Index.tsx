import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import ServiceFilter from '@/components/ServiceFilter';
import { apiService } from '@/services/apiService';
import { KnowledgeGraph as KnowledgeGraphType } from '@/types/knowledge';
import { Network, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FeedbackSection } from '@/components/FeedbackSection';

const Index: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || 'all');
  const [selectedFlow, setSelectedFlow] = useState(searchParams.get('flow') || 'all');
  const [question, setQuestion] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [graphData, setGraphData] = useState<KnowledgeGraphType | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [flows, setFlows] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionUuid, setCurrentQuestionUuid] = useState<string | null>(null);
  const { toast } = useToast();

  // Update URL when filters change
  const handleServiceChange = (service: string) => {
    setSelectedService(service);
    const newParams = new URLSearchParams(searchParams);
    if (service === 'all') {
      newParams.delete('service');
    } else {
      newParams.set('service', service);
    }
    setSearchParams(newParams);
  };

  const handleFlowChange = (flow: string) => {
    setSelectedFlow(flow);
    const newParams = new URLSearchParams(searchParams);
    if (flow === 'all') {
      newParams.delete('flow');
    } else {
      newParams.set('flow', flow);
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [graph, servicesData, flowsData] = await Promise.all([
          apiService.getKnowledgeGraph(selectedService, selectedFlow),
          apiService.getServices(),
          apiService.getFlows()
        ]);
        setGraphData(graph);
        setServices(servicesData);
        setFlows(flowsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: "Error",
          description: "Failed to load data from server",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedService, selectedFlow, toast]);

  // Load saved question from URL
  useEffect(() => {
    const questionUuid = searchParams.get('question_uuid');
    if (questionUuid) {
      setCurrentQuestionUuid(questionUuid);
      const loadAnswer = async () => {
        const savedAnswer = await apiService.getAnswer(questionUuid);
        if (savedAnswer) {
          setQuestion(savedAnswer.question);
          setReasoningText(savedAnswer.reasoning);
          setLlmResponse(savedAnswer.answer);
        }
      };
      loadAnswer();
    }
  }, [searchParams]);

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
    setReasoningText('');
    
    try {
      const stream = await apiService.askQuestion(question, {
        service: selectedService !== 'all' ? selectedService : undefined,
        flow: selectedFlow !== 'all' ? selectedFlow : undefined,
        questionUuid
      });
      
      if (stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let isAnswerPhase = false;
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          buffer += chunk;
          
          // Check if we should switch to answer phase
          if (!isAnswerPhase && buffer.includes('Answer:')) {
            const parts = buffer.split('Answer:');
            // Add remaining reasoning text
            setReasoningText(prev => prev + parts[0]);
            // Start answer phase with text after "Answer:"
            isAnswerPhase = true;
            buffer = parts[1] || '';
            if (buffer) {
              setLlmResponse(buffer);
            }
          } else if (isAnswerPhase) {
            // Continue streaming to answer
            setLlmResponse(prev => prev + chunk);
            buffer = '';
          } else {
            // Stream to reasoning
            setReasoningText(prev => prev + chunk);
          }
        }
      } else {
        // Fallback to mock response if streaming fails
        const mockReasoning = `Analyzing the knowledge graph structure...
Identifying relevant connections in the system...
Processing query context and parameters...
Examining node relationships and dependencies...
Calculating optimal traversal paths...
Evaluating service interactions...
Checking data flow patterns...
Aggregating related information...
Applying contextual filters...
Preparing comprehensive response...`;
        const mockAnswer = `Here's information about "${question}":\n\nThis is a mock streaming response. In a real implementation, this would stream from the server.`;
        
        // Stream reasoning phase
        for (let i = 0; i <= mockReasoning.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          setReasoningText(mockReasoning.slice(0, i));
        }
        
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
  

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold gradient-text">OnDeck Knowledge Base</h1>
                <p className="text-sm text-muted-foreground">Interactive System Overview</p>
              </div>
            </div>
            <ServiceFilter 
              services={services}
              flows={flows}
              selectedService={selectedService}
              onServiceChange={handleServiceChange}
              selectedFlow={selectedFlow}
              onFlowChange={handleFlowChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6 rounded-xl hover-glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nodes</p>
                  <p className="text-3xl font-bold text-primary">{graphData?.nodes.length || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary node-glow-ui"></div>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 rounded-xl hover-glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Connections</p>
                  <p className="text-3xl font-bold text-secondary">{graphData?.links.length || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-secondary node-glow-api"></div>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 rounded-xl hover-glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Services</p>
                  <p className="text-3xl font-bold text-accent">{services.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-accent node-glow-database"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Graph */}
          <div className="glass-card p-6 rounded-xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                {selectedFlow !== 'all' 
                  ? `${flows.find(f => f.value === selectedFlow)?.label || selectedFlow} Graph`
                  : selectedService !== 'all'
                    ? `${selectedService} Overview Graph`
                    : 'System Overview Graph'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Click on any node to view detailed information and relationships
              </p>
            </div>
            {isLoading ? (
              <div className="flex justify-center items-center h-[600px]">
                <div className="text-muted-foreground">Loading graph data...</div>
              </div>
            ) : graphData ? (
              <KnowledgeGraph 
                data={graphData} 
                selectedService={selectedService}
                height={600}
              />
            ) : (
              <div className="flex justify-center items-center h-[600px]">
                <div className="text-muted-foreground">No data available</div>
              </div>
            )}
          </div>

          {/* Ask a Question */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Ask a Question</h2>
            <div className="space-y-4">
              <Textarea
                placeholder="Ask anything about this graph..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[100px] bg-background/50 border-border/50"
              />
              
              <Button 
                onClick={handleAskQuestion}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                disabled={!question.trim() || isThinking}
                size="lg"
              >
                {isThinking ? 'Thinking...' : 'Submit'}
              </Button>

              {/* Reasoning Section */}
              {(isThinking || reasoningText) && (
                <Collapsible open={isReasoningExpanded} onOpenChange={setIsReasoningExpanded}>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer">
                        <h3 className="text-sm font-medium text-muted-foreground">Show thinking</h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          {isReasoningExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    
                    {/* Expanded view - show all text */}
                    <CollapsibleContent>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto mt-2">
                        {reasoningText || 'Processing...'}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

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
                          h4: ({children}) => <h4 className="text-sm font-medium mt-2 mb-1">{children}</h4>,
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

export default Index;