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
  const [showCalendar, setShowCalendar] = useState(true);

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
      if (!trip?.days) return [];
      
      const promises = Array.from({ length: trip.days }, (_, i) => {
        const dayNumber = i + 1;
        return fetch(`/api/trips/${tripId}/day-details/${dayNumber}`, {
          credentials: "include",
        }).then(res => res.ok ? res.json() : null);
      });
      
      const results = await Promise.all(promises);
      return results.filter(Boolean);
    },
    enabled: !!tripId && !!trip?.days,
  });

  const handleDayClick = (dayNumber: number, date?: string) => {
    setSelectedDay({ dayNumber, date });
    setShowDayDetail(true);
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
    .map(detail => ({
      dayNumber: detail.dayNumber,
      destination: detail.destination!,
      latitude: parseFloat(detail.latitude!),
      longitude: parseFloat(detail.longitude!),
      date: selectedDay?.date,
    }));

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
        <Tabs defaultValue="itinerary" className="w-full">
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
            <TripCalendar
              open={showCalendar}
              onOpenChange={setShowCalendar}
              tripName={trip.name}
              startDate={trip.startDate || undefined}
              endDate={trip.endDate || undefined}
              days={trip.days || undefined}
              onDayClick={handleDayClick}
            />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <Card className="p-0 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
              <JourneyMap locations={locations} />
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
        />
      )}
    </div>
  );
}
