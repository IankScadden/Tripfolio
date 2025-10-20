import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { LatLngExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

  const bounds: LatLngTuple[] = locations.map(loc => [loc.latitude, loc.longitude] as LatLngTuple);
  
  const center: LatLngExpression = locations.length === 1
    ? [locations[0].latitude, locations[0].longitude]
    : [
        locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length,
        locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length,
      ];

  const routeCoordinates: LatLngExpression[] = locations.map(loc => [loc.latitude, loc.longitude]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden" data-testid="journey-map">
      <MapContainer
        center={center}
        zoom={locations.length === 1 ? 10 : 4}
        className="h-full w-full"
        bounds={locations.length > 1 ? bounds : undefined}
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

        {locations.map((location) => (
          <Marker
            key={location.dayNumber}
            position={[location.latitude, location.longitude]}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Day {location.dayNumber}</div>
                <div className="text-muted-foreground">{location.destination}</div>
                {location.date && (
                  <div className="text-xs text-muted-foreground mt-1">{formatDate(location.date)}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
