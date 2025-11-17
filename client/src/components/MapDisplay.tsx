import { useMutation, useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import type { TravelPin } from "@shared/schema";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
  isOwnMap: boolean;
}

function MapClickHandler({ onMapClick, isOwnMap }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (isOwnMap) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface MapDisplayProps {
  userId: string;
  isOwnMap: boolean;
  height?: string;
}

const formatLocationName = (data: any): string => {
  if (!data.address) return data.display_name;
  
  const address = data.address;
  const city = address.city || address.town || address.village || address.hamlet;
  const state = address.state;
  const country = address.country;
  
  // For US locations: City, State, USA
  if (country === 'United States' || country === 'USA') {
    if (city && state) {
      return `${city}, ${state}, USA`;
    } else if (state) {
      return `${state}, USA`;
    } else {
      return 'USA';
    }
  }
  
  // For non-US locations: City, Country
  if (city && country) {
    return `${city}, ${country}`;
  } else if (country) {
    return country;
  }
  
  // Fallback to full display name
  return data.display_name;
};

export default function MapDisplay({ userId, isOwnMap, height = "500px" }: MapDisplayProps) {
  const { toast } = useToast();

  const { data: pins = [], isLoading } = useQuery<TravelPin[]>({
    queryKey: ["/api/users", userId, "pins"],
    enabled: !!userId,
  });

  const addPinMutation = useMutation({
    mutationFn: async (data: { latitude: number; longitude: number; locationName?: string }) => {
      return await apiRequest("POST", "/api/pins", {
        ...data,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "pins"] });
      toast({
        title: "Pin added!",
        description: "Your travel pin has been added to the map.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add pin",
        variant: "destructive",
      });
    },
  });

  const deletePinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      return await apiRequest("DELETE", `/api/pins/${pinId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "pins"] });
      toast({
        title: "Pin removed",
        description: "Travel pin has been removed from your map.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove pin",
        variant: "destructive",
      });
    },
  });

  const handleMapClick = async (lat: number, lng: number) => {
    if (!isOwnMap) return;

    let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json&accept-language=en`
        );
        if (response.ok) {
          const data = await response.json();
          locationName = formatLocationName(data);
        }
      } catch (err) {
        console.warn("Reverse geocoding failed, using coordinates");
      }
    }

    addPinMutation.mutate({
      latitude: lat,
      longitude: lng,
      locationName,
    });
  };

  const handleDeletePin = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    deletePinMutation.mutate(pinId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const defaultCenter: LatLngExpression = [20, 0];
  const defaultZoom = 2;

  return (
    <div style={{ height, width: "100%" }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        worldCopyJump={false}
        minZoom={2}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          noWrap={true}
          bounds={[[-90, -180], [90, 180]]}
          subdomains="abcd"
          maxZoom={20}
        />
        
        <MapClickHandler onMapClick={handleMapClick} isOwnMap={isOwnMap} />

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[parseFloat(pin.latitude), parseFloat(pin.longitude)]}
          >
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-medium mb-2">{pin.locationName || "Travel Pin"}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {parseFloat(pin.latitude).toFixed(4)}, {parseFloat(pin.longitude).toFixed(4)}
                </p>
                {isOwnMap && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => handleDeletePin(e, pin.id)}
                    className="w-full gap-1"
                    disabled={deletePinMutation.isPending}
                    data-testid={`button-delete-pin-${pin.id}`}
                  >
                    {deletePinMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
