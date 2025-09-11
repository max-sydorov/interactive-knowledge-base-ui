import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

interface ServiceFilterProps {
  services: string[];
  selectedService: string;
  onServiceChange: (service: string) => void;
  selectedFlow?: string;
  onFlowChange?: (flow: string) => void;
}

const flows = [
  { value: 'all', label: 'All flows' },
  { value: 'merchant-intake', label: 'Merchant Application Intake Experience' },
  { value: 'basic-info', label: 'Basic Info flow' }
];

const ServiceFilter: React.FC<ServiceFilterProps> = ({ 
  services, 
  selectedService, 
  onServiceChange,
  selectedFlow = 'all',
  onFlowChange = () => {}
}) => {
  return (
    <div className="flex items-center gap-3 glass-card p-4 rounded-lg">
      <Filter className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">Filter by</span>
      
      <Select value={selectedFlow} onValueChange={onFlowChange}>
        <SelectTrigger className="w-48 bg-input/50 border-border/50 hover:bg-input/70 transition-colors">
          <SelectValue placeholder="Select flow" />
        </SelectTrigger>
        <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
          {flows.map(flow => (
            <SelectItem key={flow.value} value={flow.value} className="hover:bg-accent/20">
              {flow.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedService} onValueChange={onServiceChange}>
        <SelectTrigger className="w-48 bg-input/50 border-border/50 hover:bg-input/70 transition-colors">
          <SelectValue placeholder="Select service" />
        </SelectTrigger>
        <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
          <SelectItem value="all" className="hover:bg-accent/20">
            All Services
          </SelectItem>
          {services.map(service => (
            <SelectItem key={service} value={service} className="hover:bg-accent/20">
              {service}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ServiceFilter;