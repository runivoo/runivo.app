/**
 * City pages for the seven PACE Store launch cities (the store_cities seed in supabase/migrations).
 * Place names are well-known public places; dates of races change, so organisers are named and no
 * date is promised. Have a person who lives there read each page before it goes live.
 */

export interface City {
  slug: string;
  name: string;
  state: string;
  /** Page title without " — Runivo". */
  title: string;
  description: string;
  intro: string;
  /** When it is good to run. */
  season: string;
  spots: { name: string; note: string }[];
  tips: string[];
  /** A race the city is known for, worded without a date. */
  race?: string;
  updated: string;
}

const UPDATED = '2026-11-28';

export const CITIES: City[] = [
  {
    slug: 'bengaluru', name: 'Bengaluru', state: 'Karnataka',
    title: 'Running in Bengaluru',
    description: 'Where to run in Bengaluru, the best months, and what to know about hills, traffic and weather. Runivo is opening here; join the waitlist.',
    intro: 'Bengaluru sits about 900 m above sea level, and its mild weather makes it one of the easier Indian cities to run in all year. Mornings are cool for most of the year, and there is a strong running culture around the city’s parks.',
    season: 'Most of the year works. The cooler months, roughly October to February, are the most comfortable. The monsoon, from about June to September, brings rain showers; carry a light layer and watch the footing.',
    spots: [
      { name: 'Cubbon Park', note: 'A large green park in the centre of the city, with shaded paths that many runners use in the early morning.' },
      { name: 'Lalbagh Botanical Garden', note: 'A garden with a walking and running loop and plenty of shade, popular for easy morning runs.' },
      { name: 'Sankey Tank', note: 'A lake with a path around it, in a residential area, used for easy and steady runs.' },
    ],
    tips: [
      'Traffic is heavy and starts early. Choose parks and quieter roads over main roads, and go early.',
      'Many roads roll up and down. Run by effort on hilly routes rather than by pace.',
      'Rain can arrive quickly in the monsoon. Wear something bright and pick routes with a footpath.',
    ],
    race: 'The TCS World 10K Bengaluru is a large road race held in the city, usually in the warmer part of the year. Check the organiser for dates.',
    updated: UPDATED,
  },
  {
    slug: 'mumbai', name: 'Mumbai', state: 'Maharashtra',
    title: 'Running in Mumbai',
    description: 'Where to run in Mumbai, the best months and how to handle humidity and monsoon. Runivo is opening here; join the waitlist and tell us your city.',
    intro: 'Mumbai’s sea-front promenades and parks make it a great city for running, and its humidity makes it a demanding one. Locals run early, before the heat and the crowds build.',
    season: 'The cooler, drier months, roughly November to February, are the best. March to May is hot and humid, and the monsoon, June to September, brings heavy rain and slippery roads.',
    spots: [
      { name: 'Marine Drive', note: 'The long sea-front promenade by the Arabian Sea, flat and open, and busy with runners and walkers at dawn.' },
      { name: 'Bandra Bandstand and Carter Road', note: 'Sea-front promenades in Bandra, popular with local running groups.' },
      { name: 'Sanjay Gandhi National Park', note: 'A large forest park at the edge of the city for runners who want trees and a bit of hill.' },
    ],
    tips: [
      'Humidity slows you down more than the temperature suggests. Slow your pace, and drink before and after.',
      'Promenades fill up from mid-morning. Start early for a clear path.',
      'Stay off flooded roads and open drains in the monsoon.',
    ],
    race: 'The Tata Mumbai Marathon is one of the city’s biggest running events, usually held in the cooler part of the year. Check the organiser for dates.',
    updated: UPDATED,
  },
  {
    slug: 'delhi', name: 'Delhi', state: 'Delhi',
    title: 'Running in Delhi',
    description: 'Where to run in Delhi, the best months, and what to check about air quality, heat and fog. Runivo is opening here; join the waitlist.',
    intro: 'Delhi has some of India’s best-known running spots, and some of its toughest conditions: extreme heat in summer, cold fog in winter, and air quality that can be poor from late autumn.',
    season: 'February to March and the weeks after the monsoon are generally the best. Summers, from April to June, are very hot, so run at dawn or skip hard sessions. In winter, check the air quality before you head out.',
    spots: [
      { name: 'Lodhi Garden', note: 'A historic garden with tree-lined paths, a favourite for morning runners and walking groups.' },
      { name: 'Sunder Nursery', note: 'A large landscaped park near Humayun’s Tomb with wide, quiet paths.' },
      { name: 'Nehru Park', note: 'A park in Chanakyapuri with paved paths used by local runners.' },
      { name: 'Kartavya Path and India Gate', note: 'Wide, open roads and lawns in central Delhi, busy in the evenings.' },
    ],
    tips: [
      'Check the air quality index before you run. On very poor days, run indoors or take a rest day.',
      'In winter fog, wear reflective gear and stay off busy roads.',
      'In summer, go out before sunrise and drink early.',
    ],
    race: 'The Delhi Half Marathon is the city’s main road race, usually held in the cooler autumn months. Check the organiser for dates.',
    updated: UPDATED,
  },
  {
    slug: 'pune', name: 'Pune', state: 'Maharashtra',
    title: 'Running in Pune',
    description: 'Where to run in Pune, the best months, and what to know about hills, heat and the monsoon. Runivo is opening here; join the waitlist.',
    intro: 'Pune is a hilly, student-heavy city with an active running scene, and pleasant weather for much of the year. Its hills and riverside paths make it good for both easy runs and hill work.',
    season: 'October to February is the most comfortable. April and May can be hot. The monsoon, June to September, is wet but often cool, and many runners enjoy it on the hills.',
    spots: [
      { name: 'Vetal Tekdi', note: 'A hill on the western side of the city with trails and climbs, popular for hill running and walking.' },
      { name: 'Pashan Lake', note: 'A lake on the western edge of the city, popular with runners and birdwatchers.' },
      { name: 'Savitribai Phule Pune University campus', note: 'A large green campus with quieter internal roads, used by many local runners.' },
    ],
    tips: [
      'Hills make pace misleading. Go by effort, and keep hill sessions to one a week.',
      'Early morning is cool and quiet for most of the year. The city gets busy from about 8 am.',
      'Trails get slippery in the monsoon. Wear shoes with good grip.',
    ],
    updated: UPDATED,
  },
  {
    slug: 'hyderabad', name: 'Hyderabad', state: 'Telangana',
    title: 'Running in Hyderabad',
    description: 'Where to run in Hyderabad, the best months, and how to handle the heat. Runivo is opening here; join the waitlist and tell us your city.',
    intro: 'Hyderabad is warm for most of the year, with a good set of parks and lakefront paths. The key to running here is timing: go early and keep the pace easy in the heat.',
    season: 'October to February is the best window, with cooler mornings. March to June is hot, and the monsoon, around June to September, brings showers.',
    spots: [
      { name: 'Necklace Road', note: 'A road and promenade around Hussain Sagar lake, with views and wide paths, popular for evening and morning runs.' },
      { name: 'KBR National Park', note: 'A wooded park in Jubilee Hills with a perimeter path, popular with runners and walkers.' },
      { name: 'Gachibowli Stadium area', note: 'The sports complex in Gachibowli, used by runners and athletes for track and road training.' },
    ],
    tips: [
      'Start before sunrise from April onwards. By 8 am the sun is already strong.',
      'On hot days, run by effort, not pace, and carry water.',
      'Use the shaded loops in parks for longer runs when it is warm.',
    ],
    updated: UPDATED,
  },
  {
    slug: 'chennai', name: 'Chennai', state: 'Tamil Nadu',
    title: 'Running in Chennai',
    description: 'Where to run in Chennai, the best months, and how to manage heat, humidity and the north-east monsoon. Runivo is opening here; join the waitlist.',
    intro: 'Chennai is hot and humid for most of the year, with a long, flat coastline. Runners start well before sunrise, and the best runs here are slow and early.',
    season: 'December to February is the most comfortable. April to June is very hot and humid. The north-east monsoon, around October to December, brings the heaviest rain.',
    spots: [
      { name: 'Marina Beach', note: 'A long beachfront promenade on the Bay of Bengal, flat and wide, busy with runners at dawn.' },
      { name: 'Elliot’s Beach, Besant Nagar', note: 'A quieter beach and promenade in the south of the city, popular with local running groups.' },
      { name: 'Adyar Eco Park', note: 'A restored creek and wetland park with paths, used for easy runs.' },
    ],
    tips: [
      'Humidity is the main challenge. Slow down, wear light clothes and replace salts after long runs.',
      'Start before sunrise to run before the temperature climbs.',
      'During heavy monsoon rain, move to a treadmill, and log it in Runivo by hand.',
    ],
    updated: UPDATED,
  },
  {
    slug: 'kolkata', name: 'Kolkata', state: 'West Bengal',
    title: 'Running in Kolkata',
    description: 'Where to run in Kolkata, the best months, and what to know about humidity and the monsoon. Runivo is opening here; join the waitlist.',
    intro: 'Kolkata has big open spaces and lakeside paths, and a strong tradition of morning exercise. Humidity is high for much of the year, so the cool winter months are when running is at its best.',
    season: 'November to February is the best time, with cooler, drier mornings. March to May is hot and humid, and the monsoon from about June to September brings heavy rain.',
    spots: [
      { name: 'The Maidan', note: 'A huge open green space in central Kolkata, used by walkers and runners in the early morning.' },
      { name: 'Rabindra Sarobar', note: 'A large lake and park in the south of the city, with paths around the water and a regular crowd of morning runners.' },
      { name: 'Eco Park, New Town', note: 'A large landscaped park with wide paths and a lake, in the north-east of the city.' },
    ],
    tips: [
      'Early mornings are the best time to run here. Aim to be done by sunrise on hot days.',
      'Be careful on wet paving in the monsoon, and avoid flooded stretches.',
      'Winter mornings can bring mist. Wear reflective gear.',
    ],
    race: 'The Tata Steel Kolkata 25K is a well-known road race in the city, usually held in the cooler winter months. Check the organiser for dates.',
    updated: UPDATED,
  },
];

export const getCity = (slug: string): City | undefined => CITIES.find(c => c.slug === slug);
