import React, { useState, useMemo, useEffect } from 'react';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import ServiceFilter from '@/components/ServiceFilter';
import { apiService } from '@/services/apiService';
import { KnowledgeGraph as KnowledgeGraphType } from '@/types/knowledge';
import { Network } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Index: React.FC = () => {
  const [selectedService, setSelectedService] = useState('all');
  const [selectedFlow, setSelectedFlow] = useState('all');
  const [question, setQuestion] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [graphData, setGraphData] = useState<KnowledgeGraphType | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [graph, servicesData] = await Promise.all([
          apiService.getKnowledgeGraph(selectedService, selectedFlow),
          apiService.getServices()
        ]);
        setGraphData(graph);
        setServices(servicesData);
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

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    setIsThinking(true);
    setLlmResponse('');
    
    try {
      const stream = await apiService.askQuestion(question, {
        service: selectedService !== 'all' ? selectedService : undefined,
        flow: selectedFlow !== 'all' ? selectedFlow : undefined
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold gradient-text">Knowledge Base</h1>
                <p className="text-sm text-muted-foreground">Interactive System Architecture</p>
              </div>
            </div>
            <ServiceFilter 
              services={services}
              selectedService={selectedService}
              onServiceChange={setSelectedService}
              selectedFlow={selectedFlow}
              onFlowChange={setSelectedFlow}
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
                  <p className="text-sm text-muted-foreground">Total Nodes</p>
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
                  <p className="text-sm text-muted-foreground">Services</p>
                  <p className="text-3xl font-bold text-secondary">{services.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-secondary node-glow-api"></div>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 rounded-xl hover-glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Connections</p>
                  <p className="text-3xl font-bold text-accent">{graphData?.links.length || 0}</p>
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
              <h2 className="text-xl font-semibold">System Architecture Graph</h2>
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

export default Index;