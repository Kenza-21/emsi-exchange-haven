
import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Share, Copy, Check, Facebook, Github } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ShareQRCodeProps {
  listingId: string;
  title: string;
}

export function ShareQRCode({ listingId, title }: ShareQRCodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const listingUrl = `${window.location.origin}/listing/${listingId}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setCopied(true);
      toast({ title: 'Link copied to clipboard' });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ 
        title: 'Failed to copy link', 
        variant: 'destructive' 
      });
    }
  };
  
  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(`Check out this item: ${title} - ${listingUrl}`);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };
  
  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}`, '_blank');
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2"
      >
        <Share className="h-4 w-4" />
        Share Listing
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this listing</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeCanvas
                value={listingUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </div>
            
            <p className="text-sm text-gray-500 mt-4 mb-2">
              Scan this QR code or share via:
            </p>
            
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                onClick={handleShareWhatsApp}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                onClick={handleShareFacebook}
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>URL: <span className="font-mono">{listingUrl}</span></p>
          </div>
          
          <DialogClose asChild>
            <Button variant="outline" className="w-full mt-4">
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
