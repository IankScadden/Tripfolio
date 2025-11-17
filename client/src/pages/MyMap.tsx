import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Trash2, ArrowLeft } from "lucide-react";
import type { TravelPin } from "@shared/schema";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/hooks/useAuth";

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

export default function MyMap() {
  const [, params] = useRoute("/map/:userId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = params?.userId;
  const isOwnMap = user?.id === userId;

  const { data: pins = [], isLoading } = useQuery<TravelPin[]>({
    queryKey: ["/api/users", userId, "pins"],
    enabled: !!userId,
  });

  const { data: mapUser } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId,
  });

  const addPinMutation = useMutation({
    mutationFn: async (data: { latitude: number; longitude: number; locationName?: string }) => {
      // Convert numbers to strings for decimal database columns
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

    // Default to coordinates as location name
    let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    // Try reverse geocoding (optional, don't block pin creation if it fails)
    const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json&accept-language=en`
        );
        if (response.ok) {
          const data = await response.json();
          locationName = data.display_name || locationName;
        }
      } catch (err) {
        // Silently fall back to coordinates if geocoding fails
        console.warn("Reverse geocoding failed, using coordinates");
      }
    }

    // Always create the pin, even if reverse geocoding failed
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const defaultCenter: LatLngExpression = [20, 0]; // World view
  const defaultZoom = 2;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/profile/${userId}`)}
            data-testid="button-back-to-profile"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {isOwnMap ? "My Map" : `${mapUser?.displayName || "User"}'s Map`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isOwnMap 
                ? "Click anywhere on the map to drop a pin where you've traveled"
                : `Viewing ${mapUser?.displayName || "user"}'s travel pins`
              }
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{pins.length} {pins.length === 1 ? 'location' : 'locations'}</span>
          </div>
        </div>

        {/* Map */}
        <Card className="overflow-hidden">
          <div style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
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
        </Card>

        {/* Instructions */}
        {isOwnMap && pins.length === 0 && (
          <div className="mt-6 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">Start mapping your travels!</p>
            <p className="text-sm">Click anywhere on the map to drop your first pin</p>
          </div>
        )}
      </div>
    </div>
  );
}
