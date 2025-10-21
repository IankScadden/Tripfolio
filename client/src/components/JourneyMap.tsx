import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { LatLngExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DayLocation {
  dayNumber: number;
  destination: string;
  latitude: number;
  longitude: number;
  date?: string;
}

interface JourneyMapProps {
  locations: DayLocation[];
}

interface GroupedLocation {
  latitude: number;
  longitude: number;
  destination: string;
  days: DayLocation[];
}

function MarkerWithDayNavigation({ group }: { group: GroupedLocation }) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const currentDay = group.days[currentDayIndex];
  const hasMultipleDays = group.days.length > 1;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handlePrevious = () => {
    setCurrentDayIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentDayIndex((prev) => Math.min(group.days.length - 1, prev + 1));
  };

  return (
    <Marker
      position={[group.latitude, group.longitude]}
      data-testid={`marker-day-${currentDay.dayNumber}`}
    >
      <Popup>
        <div className="min-w-[200px]">
          <div className="text-sm mb-2">
            <div className="font-semibold text-base">Day {currentDay.dayNumber}</div>
            <div className="text-muted-foreground">{currentDay.destination}</div>
            {currentDay.date && (
              <div className="text-xs text-muted-foreground mt-1">{formatDate(currentDay.date)}</div>
            )}
          </div>
          
          {hasMultipleDays && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentDayIndex === 0}
                className="h-7 px-2"
                data-testid="button-prev-day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs text-muted-foreground">
                {currentDayIndex + 1} of {group.days.length} days
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNext}
                disabled={currentDayIndex === group.days.length - 1}
                className="h-7 px-2"
                data-testid="button-next-day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export function JourneyMap({ locations }: JourneyMapProps) {
  const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;

  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-2">Map not available</p>
          <p className="text-sm text-muted-foreground">
            LocationIQ API key is not configured. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-2">No destinations added yet</p>
          <p className="text-sm text-muted-foreground">
            Add destinations in the Daily Itinerary to see your journey map
          </p>
        </div>
      </div>
    );
  }

  // Group locations by coordinates (same city)
  // Using 0.05 degrees (~5.5km) to group locations within the same city
  // This handles geocoding variations for the same destination
  const groupedLocations: GroupedLocation[] = [];
  locations.forEach((location) => {
    const existing = groupedLocations.find(
      (group) =>
        Math.abs(group.latitude - location.latitude) < 0.05 &&
        Math.abs(group.longitude - location.longitude) < 0.05
    );

    if (existing) {
      existing.days.push(location);
    } else {
      groupedLocations.push({
        latitude: location.latitude,
        longitude: location.longitude,
        destination: location.destination,
        days: [location],
      });
    }
  });

  // Sort days within each group by dayNumber for consistent navigation
  groupedLocations.forEach((group) => {
    group.days.sort((a, b) => a.dayNumber - b.dayNumber);
  });

  const bounds: LatLngTuple[] = groupedLocations.map(loc => [loc.latitude, loc.longitude] as LatLngTuple);
  
  const center: LatLngExpression = groupedLocations.length === 1
    ? [groupedLocations[0].latitude, groupedLocations[0].longitude]
    : [
        groupedLocations.reduce((sum, loc) => sum + loc.latitude, 0) / groupedLocations.length,
        groupedLocations.reduce((sum, loc) => sum + loc.longitude, 0) / groupedLocations.length,
      ];

  // Route coordinates follow the original day order
  const routeCoordinates: LatLngExpression[] = locations.map(loc => [loc.latitude, loc.longitude]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden" data-testid="journey-map">
      <MapContainer
        center={center}
        zoom={groupedLocations.length === 1 ? 10 : 4}
        className="h-full w-full"
        bounds={groupedLocations.length > 1 ? bounds : undefined}
        boundsOptions={{ padding: [50, 50] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; <a href="https://locationiq.com">LocationIQ</a>'
          url={`https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${import.meta.env.VITE_LOCATIONIQ_API_KEY}`}
        />
        
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#4F75FF"
            weight={3}
            opacity={0.7}
          />
        )}

        {groupedLocations.map((group, index) => (
          <MarkerWithDayNavigation key={index} group={group} />
        ))}
      </MapContainer>
    </div>
  );
}
