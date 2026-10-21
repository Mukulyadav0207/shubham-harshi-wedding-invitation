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
  mapEmbedUrl: string;
};

export const venues: readonly Venue[] = [
  {
    id: 1,
    type: 'celebration-venue',
    label: 'Celebration Venue',
    date: '20 – 21 November 2026',
    time: 'Haldi through Reception',
    name: 'The Crown Palace',
    address: 'Makronia Rd, Sagar, MP 470002',
    image: '/assets/images/venues/crown-palace.webp',
    mapQuery:
      'VQ2J 5PW The Crown Palace Hotel, Makronia Rd, near Hawk Canteen, Sagar, Makroniya, Madhya Pradesh 470002',
    directionsUrl:
      'https://maps.app.goo.gl/6UkZUiMr8UvLNqtM6?g_st=iw',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3649.1023742981524!2d78.78182129999999!3d23.8504982!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3978d141add80193%3A0x75c6064b8500624e!2sThe%20Crown%20Palace%20Hotel!5e0!3m2!1sen!2sin!4v1792249185221!5m2!1sen!2sin',
  },
] as const;
