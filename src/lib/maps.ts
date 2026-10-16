/** Stable Google Maps directions URL — works on iOS Safari and Android. */
export function googleMapsDirectionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
