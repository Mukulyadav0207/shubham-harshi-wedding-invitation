import { googleMapsDirectionsUrl } from '@/lib/maps';

export type Venue = {
  id: number;
  type: string;
  label: string;
  date: string;
  time: string;
  name: string;
  address: string;
  image: string;
  mapQuery: string;
  directionsUrl: string;
};

export const venues: readonly Venue[] = [
  {
    id: 1,
    type: 'lagan-sagai',
    label: 'Lagan-Sagai',
    date: '24 Nov, 2026',
    time: '3:00 PM onwards',
    name: 'Basti Ram Palace',
    address: '16G, Kankrola, IMT Manesar, Gurugram, Haryana',
    image: '/assets/images/venues/lagan-venue.webp',
    mapQuery: 'Basti Ram Palace, 16G, Kankrola, IMT Manesar, Gurugram, Haryana',
    directionsUrl: googleMapsDirectionsUrl(
      'Basti Ram Palace, 16G, Kankrola, IMT Manesar, Gurugram, Haryana',
    ),
  },
  {
    id: 2,
    type: 'haldi-mehndi-sangeet',
    label: 'Haldi, Mehndi & Sangeet',
    date: '25 Nov, 2026',
    time: '12:00 PM onwards',
    name: 'The Divine Wedding Farm',
    address: 'Sector 91, Gurugram, Haryana 122505',
    image: '/assets/images/venues/haldi-mehndi-sangeet-venue.webp',
    mapQuery: 'The Divine Wedding Farm, Sector 91, Gurugram, Haryana 122505',
    directionsUrl: 'https://maps.app.goo.gl/EHE1SmTQJ94wyvCc8?g_st=aw',
  },
  {
    id: 3,
    type: 'barat',
    label: 'Wedding',
    date: '26 Nov, 2026',
    time: '7:00 PM Onwards',
    name: 'Raj Resort',
    address: 'NH58, Meerut-Baghpat Bypaas, Meerut, Uttar Pradesh',
    image: '/assets/images/venues/barat-venue.webp',
    mapQuery: 'Raj Resort, NH58, Meerut-Baghpat Bypaas, Meerut, Uttar Pradesh',
    directionsUrl: googleMapsDirectionsUrl(
      'Raj Resort, NH58, Meerut-Baghpat Bypaas, Meerut, Uttar Pradesh',
    ),
  },
] as const;
