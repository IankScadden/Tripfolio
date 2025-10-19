const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
const GEOCODE_BASE_URL = 'https://us1.locationiq.com/v1/search';

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

export async function geocodeDestination(destination: string): Promise<GeocodingResult | null> {
  if (!destination || !LOCATIONIQ_API_KEY) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      key: LOCATIONIQ_API_KEY,
      q: destination,
      format: 'json',
      limit: '1',
    });

    const response = await fetch(`${GEOCODE_BASE_URL}?${params}`);
    
    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding destination:', error);
    return null;
  }
}
