const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;
const GEOCODE_BASE_URL = 'https://us1.locationiq.com/v1/search';

export interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodeDestination(destination: string): Promise<GeocodingResult | null> {
  console.log('[Geocoding] Starting geocode for:', destination);
  console.log('[Geocoding] API key available:', !!LOCATIONIQ_API_KEY);
  
  if (!destination || !LOCATIONIQ_API_KEY) {
    console.log('[Geocoding] Missing destination or API key');
    return null;
  }

  try {
    const params = new URLSearchParams({
      key: LOCATIONIQ_API_KEY,
      q: destination,
      format: 'json',
      limit: '1',
    });

    const url = `${GEOCODE_BASE_URL}?${params}`;
    console.log('[Geocoding] Fetching:', url.replace(LOCATIONIQ_API_KEY, 'REDACTED'));
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('[Geocoding] Failed with status:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('[Geocoding] Error response:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('[Geocoding] Response data:', JSON.stringify(data).substring(0, 200));
    
    if (data && data.length > 0) {
      const result = {
        lat: data[0].lat,
        lon: data[0].lon,
        display_name: data[0].display_name,
      };
      console.log('[Geocoding] Success:', result);
      return result;
    }

    console.log('[Geocoding] No results found');
    return null;
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
}
