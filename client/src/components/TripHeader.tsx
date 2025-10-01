import { Calendar, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TripHeaderProps {
  tripName: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  onShare: () => void;
  onEdit?: () => void;
}

export default function TripHeader({
  tripName,
  startDate,
  endDate,
  days,
  totalCost,
  onShare,
  onEdit,
}: TripHeaderProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1
            className="text-4xl font-bold text-foreground mb-2 cursor-pointer hover-elevate active-elevate-2 rounded-md px-2 -ml-2"
            onClick={onEdit}
            data-testid="text-trip-name"
          >
            {tripName}
          </h1>
          {(startDate || endDate || days) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm" data-testid="text-trip-dates">
                {startDate && endDate
                  ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                  : days
                  ? `${days} days`
                  : "Dates not set"}
              </span>
            </div>
          )}
        </div>
        <Button
          onClick={onShare}
          variant="outline"
          className="gap-2"
          data-testid="button-share-trip"
        >
          <Share2 className="h-4 w-4" />
          Share Trip
        </Button>
      </div>

      <div className="flex items-baseline gap-4 flex-wrap">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Total Budget</div>
          <div
            className="text-5xl font-bold text-primary"
            data-testid="text-total-cost"
          >
            ${totalCost.toLocaleString()}
          </div>
        </div>
        {days && (
          <Badge variant="secondary" className="text-base px-4 py-1">
            {days} days
          </Badge>
        )}
      </div>
    </div>
  );
}
