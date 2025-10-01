import { Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TripCardProps {
  name: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalCost: number;
  onClick: () => void;
}

export default function TripCard({
  name,
  startDate,
  endDate,
  days,
  totalCost,
  onClick,
}: TripCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer"
      onClick={onClick}
      data-testid={`card-trip-${name}`}
    >
      <CardHeader className="pb-3">
        <h3 className="text-lg font-semibold text-foreground" data-testid="text-trip-card-name">
          {name}
        </h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {(startDate || endDate || days) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {startDate && endDate
                ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                : days
                ? `${days} days`
                : "No dates set"}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-bold text-primary" data-testid="text-trip-card-cost">
              ${totalCost.toLocaleString()}
            </span>
          </div>
          {days && (
            <Badge variant="secondary">{days} days</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
