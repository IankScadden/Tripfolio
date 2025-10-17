import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface TripCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripName: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  onDayClick: (dayNumber: number, date?: string) => void;
}

export default function TripCalendar({
  open,
  onOpenChange,
  tripName,
  startDate,
  endDate,
  days,
  onDayClick,
}: TripCalendarProps) {
  const getDaysArray = () => {
    if (startDate && days) {
      const start = new Date(startDate);
      const daysArray = [];
      
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        daysArray.push({
          dayNumber: i + 1,
          date: currentDate,
          dateString: currentDate.toISOString().split('T')[0],
        });
      }
      return daysArray;
    } else if (days) {
      return Array.from({ length: days }, (_, i) => ({
        dayNumber: i + 1,
        date: null,
        dateString: null,
      }));
    }
    return [];
  };

  const daysArray = getDaysArray();
  const hasActualDates = startDate && days;

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDateNumber = (date: Date) => {
    return date.getDate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-trip-calendar">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <DialogTitle>Trip Calendar - {tripName}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Click on any day to add activities, lodging, and transportation details.
          </p>
        </DialogHeader>

        <div className="py-6">
          <div className="grid grid-cols-7 gap-3">
            {daysArray.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onDayClick(day.dayNumber, day.dateString || undefined)}
                className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border hover-elevate active-elevate-2 transition-all"
                data-testid={`button-day-${day.dayNumber}`}
              >
                {hasActualDates && day.date ? (
                  <>
                    <div className="text-xs text-muted-foreground mb-1">
                      {getDayName(day.date)}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {getDateNumber(day.date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Day {day.dayNumber}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold">
                      Day {day.dayNumber}
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            data-testid="button-close-calendar"
          >
            Close
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1"
            data-testid="button-save-itinerary"
          >
            Save Itinerary
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
