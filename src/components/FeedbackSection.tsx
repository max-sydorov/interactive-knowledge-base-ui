import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';

interface FeedbackSectionProps {
  questionUuid: string;
}

export const FeedbackSection = ({ questionUuid }: FeedbackSectionProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'good' | 'bad' | null>(null);
  const { toast } = useToast();

  const handleThumbsUp = async () => {
    if (feedbackGiven) return;
    
    setIsSubmitting(true);
    try {
      await apiService.postFeedback(questionUuid, 'good');
      setFeedbackGiven('good');
      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your positive feedback!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbsDown = () => {
    if (feedbackGiven) return;
    setIsDialogOpen(true);
  };

  const handleSubmitNegativeFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide feedback details.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.postFeedback(questionUuid, 'bad', feedbackMessage);
      setFeedbackGiven('bad');
      setIsDialogOpen(false);
      setFeedbackMessage('');
      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your feedback! We\'ll use it to improve.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
        <span className="text-sm text-muted-foreground">Was this helpful?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsUp}
          disabled={isSubmitting || feedbackGiven !== null}
          className={`hover:bg-muted hover:text-current ${feedbackGiven === 'good' ? 'text-primary' : ''}`}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsDown}
          disabled={isSubmitting || feedbackGiven !== null}
          className={`hover:bg-muted hover:text-current ${feedbackGiven === 'bad' ? 'text-destructive' : ''}`}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              Please tell us what was wrong with the answer and what you expected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="What was wrong? What did you expect?"
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setFeedbackMessage('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitNegativeFeedback}
              disabled={isSubmitting || !feedbackMessage.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
