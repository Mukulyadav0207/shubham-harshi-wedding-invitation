type VenueMapProps = {
  query: string;
  venueName: string;
};

/** Lightweight Google Maps query embed; no API key or JavaScript SDK required. */
export default function VenueMap({ query, venueName }: VenueMapProps) {
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <iframe
      src={mapUrl}
      title={`Map showing ${venueName}`}
      width="100%"
      height="100%"
      loading="lazy"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
