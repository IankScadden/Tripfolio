import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coffee, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TipButtonProps = {
  tripId: string;
  tripName: string;
  creatorName?: string;
  creatorClerkId?: string;
};

type TipStatus = {
  canReceiveTips: boolean;
  creatorName: string;
};

const TIP_AMOUNTS = [
  { value: 300, label: "$3" },
  { value: 500, label: "$5" },
  { value: 1000, label: "$10" },
];

export function TipButton({ tripId, tripName, creatorName, creatorClerkId }: TipButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch creator's tip status when dialog is opened
  const { data: tipStatus } = useQuery<TipStatus>({
    queryKey: ["/api/creators", creatorClerkId, "tip-status"],
    enabled: !!creatorClerkId && showDialog,
  });

  const handleTip = async (amount: number) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/tips/checkout", {
        tripId,
        tripName,
        amount,
        creatorName,
      });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to create tip checkout:", error);
      toast({
        title: "Error",
        description: "Failed to process tip. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
        data-testid="button-tip"
      >
        <Coffee className="h-4 w-4" />
        <span className="hidden sm:inline">Buy Me a Coffee</span>
        <span className="sm:hidden">Tip</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Support This Trip
            </DialogTitle>
            <DialogDescription>
              {creatorName 
                ? `Show your appreciation for ${creatorName}'s travel content!`
                : "Show your appreciation for this travel content!"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your support helps create more detailed travel guides and itineraries.
            </p>
            
            <div className="flex gap-3 justify-center">
              {TIP_AMOUNTS.map((tip) => (
                <Button
                  key={tip.value}
                  variant="secondary"
                  size="lg"
                  onClick={() => handleTip(tip.value)}
                  disabled={isLoading}
                  className="flex-1 h-16 text-lg font-semibold"
                  data-testid={`button-tip-${tip.value}`}
                >
                  {isLoading ? "..." : tip.label}
                </Button>
              ))}
            </div>

            {/* Tip destination messaging */}
            <div className="mt-4 pt-4 border-t">
              {tipStatus?.canReceiveTips ? (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Tips go directly to {tipStatus.creatorName || creatorName || 'the creator'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Tips support Tripfolio until {creatorName || 'the creator'} connects their Stripe account
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
