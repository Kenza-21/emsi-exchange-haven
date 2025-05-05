
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Profile } from '@/types/database';
import { useMessages } from '@/hooks/useMessages';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface ContactButtonProps {
  owner: Profile | null;
  itemId: string;
  itemTitle: string;
}

export function ContactButton({ owner, itemId, itemTitle }: ContactButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(`Hello, I'm writing about "${itemTitle}" that you found.`);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { sendMessage } = useMessages();

  if (!owner) {
    return null;
  }
  
  // Don't show contact button for own items
  if (user?.id === owner.id) {
    return (
      <Button disabled className="w-full">
        <MessageSquare className="h-4 w-4 mr-2" />
        Your Item
      </Button>
    );
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      setIsSending(true);
      await sendMessage(owner.id, message, undefined, itemId);
      toast({
        title: "Message sent",
        description: `Your message has been sent to ${owner.full_name}`,
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <Button onClick={() => navigate('/login')} className="w-full">
        <MessageSquare className="h-4 w-4 mr-2" />
        Login to Contact Finder
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact Finder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contact {owner.full_name}</DialogTitle>
          <DialogDescription>
            Send a message about the "{itemTitle}" item
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              required
              className="h-24"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
