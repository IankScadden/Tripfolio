import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Map } from "lucide-react";
import TripCalendar from "@/components/TripCalendar";
import DayDetail from "@/components/DayDetail";
import { JourneyMap } from "@/components/JourneyMap";
import type { Trip, DayDetail as DayDetailType } from "@shared/schema";

export default function ItineraryPlanner() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const tripId = params?.id;

  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ dayNumber: number; date?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [navigationSource, setNavigationSource] = useState<"itinerary" | "map" | null>(null);

  const { data: trip, isLoading: tripLoading } = useQuery<Trip>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  const { data: dayDetails = [] } = useQuery<DayDetailType[]>({
    queryKey: ["/api/trips", tripId, "all-day-details"],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/all-day-details`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch day details");
      return res.json();
    },
    enabled: !!tripId,
  });

  const handleDayClick = (dayNumber: number, date?: string, source?: "itinerary" | "map") => {
    setSelectedDay({ dayNumber, date });
    setShowDayDetail(true);
    setNavigationSource(source || "itinerary");
  };

  const handleEditDayFromMap = (dayNumber: number, date?: string) => {
    setActiveTab("itinerary");
    handleDayClick(dayNumber, date, "map");
  };

  const handleReturnToMap = () => {
    setShowDayDetail(false);
    setActiveTab("map");
    setNavigationSource(null);
  };

  const handlePrevious = () => {
    if (selectedDay && selectedDay.dayNumber > 1) {
      const newDayNumber = selectedDay.dayNumber - 1;
      let newDate: string | undefined = undefined;
      
      if (trip?.startDate) {
        const [year, month, day] = trip.startDate.split('-').map(Number);
        const calculatedDate = new Date(year, month - 1, day + newDayNumber - 1);
        newDate = calculatedDate.toISOString().split('T')[0];
      }
      
      setSelectedDay({ dayNumber: newDayNumber, date: newDate });
    }
  };

  const handleNext = () => {
    if (selectedDay && trip?.days && selectedDay.dayNumber < trip.days) {
      const newDayNumber = selectedDay.dayNumber + 1;
      let newDate: string | undefined = undefined;
      
      if (trip?.startDate) {
        const [year, month, day] = trip.startDate.split('-').map(Number);
        const calculatedDate = new Date(year, month - 1, day + newDayNumber - 1);
        newDate = calculatedDate.toISOString().split('T')[0];
      }
      
      setSelectedDay({ dayNumber: newDayNumber, date: newDate });
    }
  };

  const handleSave = () => {
    // Refetch day details after saving
    queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "all-day-details"] });
  };

  const foodBudget = dayDetails.reduce((total, detail) => {
    return total + (detail.foodBudgetAdjustment ? parseFloat(detail.foodBudgetAdjustment) : 0);
  }, 0);
  const dailyFoodBudget = trip?.days && trip.days > 0 ? Math.round(foodBudget / trip.days) : 0;

  const locations = dayDetails
    .filter(detail => detail.destination && detail.latitude && detail.longitude)
    .map(detail => {
      let date: string | undefined;
      if (trip?.startDate) {
        const [year, month, day] = trip.startDate.split('-').map(Number);
        const calculatedDate = new Date(year, month - 1, day + detail.dayNumber - 1);
        date = calculatedDate.toISOString().split('T')[0];
      }
      return {
        dayNumber: detail.dayNumber,
        destination: detail.destination!,
        latitude: parseFloat(detail.latitude!),
        longitude: parseFloat(detail.longitude!),
        date,
      };
    });

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading itinerary...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Trip not found</h2>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Trips
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/trip/${tripId}`)}
              data-testid="button-back-to-trip"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{trip.name}</h1>
              <p className="text-sm text-muted-foreground">
                {trip.days} day itinerary planner
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="itinerary" className="gap-2" data-testid="tab-daily-itinerary">
              <Calendar className="h-4 w-4" />
              Daily Itinerary
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2" data-testid="tab-journey-map">
              <Map className="h-4 w-4" />
              Journey Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="itinerary" className="mt-0">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-muted-foreground">
                    Click on any day to add activities, lodging, and transportation details.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Array.from({ length: trip.days || 0 }, (_, i) => {
                    const dayNumber = i + 1;
                    let date: Date | null = null;
                    let dateString = "";
                    
                    if (trip.startDate) {
                      const [year, month, day] = trip.startDate.split('-').map(Number);
                      date = new Date(year, month - 1, day + i);
                      dateString = date.toLocaleDateString('en-US', { weekday: 'short' });
                    }
                    
                    const dayDetail = dayDetails.find(d => d.dayNumber === dayNumber);
                    const hasDestination = !!dayDetail?.destination;
                    
                    return (
                      <button
                        key={dayNumber}
                        onClick={() => {
                          let clickDate: string | undefined = undefined;
                          if (trip.startDate) {
                            const [year, month, day] = trip.startDate.split('-').map(Number);
                            const calculatedDate = new Date(year, month - 1, day + i);
                            clickDate = calculatedDate.toISOString().split('T')[0];
                          }
                          handleDayClick(dayNumber, clickDate);
                        }}
                        className={`p-4 border rounded-lg text-center hover-elevate active-elevate-2 transition-colors ${
                          hasDestination ? 'bg-primary/5 border-primary/20' : 'bg-card'
                        }`}
                        data-testid={`button-day-${dayNumber}`}
                      >
                        {date && (
                          <div className="text-xs text-muted-foreground mb-1">
                            {dateString}
                          </div>
                        )}
                        <div className="text-2xl font-bold mb-1">
                          {date ? date.getDate() : dayNumber}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                          Day {dayNumber}
                        </div>
                        {hasDestination && (
                          <div className="text-xs text-primary mt-2 truncate">
                            {dayDetail.destination}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <Card className="p-0 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
              <JourneyMap locations={locations} onEditDay={handleEditDayFromMap} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showDayDetail && selectedDay && trip && (
        <DayDetail
          tripId={tripId!}
          dayNumber={selectedDay.dayNumber}
          date={selectedDay.date}
          open={showDayDetail}
          onOpenChange={setShowDayDetail}
          totalDays={trip.days || 0}
          dailyFoodBudget={dailyFoodBudget}
          onSave={handleSave}
          onPrevious={selectedDay.dayNumber > 1 ? handlePrevious : undefined}
          onNext={trip.days && selectedDay.dayNumber < trip.days ? handleNext : undefined}
          onReturnToMap={navigationSource === "map" ? handleReturnToMap : undefined}
        />
      )}
    </div>
  );
}
