import { Location } from '../types';
import { YAOUNDE_LOCATIONS, LAGOS_LOCATIONS } from '../data';

// Neighborhood specific hubs with offsets to provide detailed locations inside neighborhoods
const NEIGHBORHOOD_PROPOSALS: {
  [key: string]: {
    city: 'Yaoundé' | 'Douala';
    locations: { name: string; latOffset: number; lngOffset: number }[];
  }
} = {
  bastos: {
    city: 'Yaoundé',
    locations: [
      { name: 'Carrefour Bastos', latOffset: 0.0025, lngOffset: 0.0020 },
      { name: 'Total Bastos Station', latOffset: 0.0040, lngOffset: 0.0035 },
      { name: 'Bastos Administrative & Embassy District', latOffset: 0.0000, lngOffset: 0.0000 },
      { name: 'Club Bastos (Sporting)', latOffset: -0.0030, lngOffset: 0.0045 },
      { name: 'Palais des Congrès Bastos', latOffset: 0.0080, lngOffset: -0.0050 },
      { name: 'Residence du Nigeria (Bastos)', latOffset: 0.0015, lngOffset: -0.0025 }
    ]
  },
  'biyem-assi': {
    city: 'Yaoundé',
    locations: [
      { name: 'Carrefour Biyem-Assi', latOffset: -0.0250, lngOffset: -0.0220 },
      { name: 'Marché de Biyem-Assi', latOffset: -0.0230, lngOffset: -0.0240 },
      { name: 'Total Biyem-Assi Station', latOffset: -0.0260, lngOffset: -0.0210 },
      { name: 'Rond-point Express Biyem-Assi', latOffset: -0.0210, lngOffset: -0.0180 },
      { name: 'Lycée de Biyem-Assi', latOffset: -0.0280, lngOffset: -0.0250 },
      { name: 'Carrefour Acacia Biyem-Assi', latOffset: -0.0245, lngOffset: -0.0225 }
    ]
  },
  'biyem assi': {
    city: 'Yaoundé',
    locations: [
      { name: 'Carrefour Biyem-Assi', latOffset: -0.0250, lngOffset: -0.0220 },
      { name: 'Marché de Biyem-Assi', latOffset: -0.0230, lngOffset: -0.0240 },
      { name: 'Total Biyem-Assi Station', latOffset: -0.0260, lngOffset: -0.0210 },
      { name: 'Rond-point Express Biyem-Assi', latOffset: -0.0210, lngOffset: -0.0180 },
      { name: 'Lycée de Biyem-Assi', latOffset: -0.0280, lngOffset: -0.0250 },
      { name: 'Carrefour Acacia Biyem-Assi', latOffset: -0.0245, lngOffset: -0.0225 }
    ]
  },
  biyem: {
    city: 'Yaoundé',
    locations: [
      { name: 'Carrefour Biyem-Assi', latOffset: -0.0250, lngOffset: -0.0220 },
      { name: 'Marché de Biyem-Assi', latOffset: -0.0230, lngOffset: -0.0240 },
      { name: 'Total Biyem-Assi Station', latOffset: -0.0260, lngOffset: -0.0210 },
      { name: 'Rond-point Express Biyem-Assi', latOffset: -0.0210, lngOffset: -0.0180 },
      { name: 'Lycée de Biyem-Assi', latOffset: -0.0280, lngOffset: -0.0250 },
      { name: 'Carrefour Acacia Biyem-Assi', latOffset: -0.0245, lngOffset: -0.0225 }
    ]
  },
  melen: {
    city: 'Yaoundé',
    locations: [
      { name: 'Santa Lucia Supermarket (Melen)', latOffset: -0.0050, lngOffset: -0.0210 },
      { name: 'Total Melen Station', latOffset: -0.0030, lngOffset: -0.0190 },
      { name: 'Carrefour Melen', latOffset: -0.0015, lngOffset: -0.0215 },
      { name: 'CHU Melen Hospital', latOffset: -0.0080, lngOffset: -0.0230 },
      { name: 'Polytechnique Melen Campus', latOffset: -0.0065, lngOffset: -0.0185 }
    ]
  },
  mendong: {
    city: 'Yaoundé',
    locations: [
      { name: 'Carrefour Mendong', latOffset: -0.0290, lngOffset: -0.0310 },
      { name: 'Total Mendong Station', latOffset: -0.0305, lngOffset: -0.0295 },
      { name: 'Marché de Mendong', latOffset: -0.0320, lngOffset: -0.0320 },
      { name: 'Lycée de Mendong', latOffset: -0.0280, lngOffset: -0.0330 },
      { name: 'Camp Gendarmerie Mendong', latOffset: -0.0270, lngOffset: -0.0300 }
    ]
  },
  obili: {
    city: 'Yaoundé',
    locations: [
      { name: 'Carrefour Obili', latOffset: -0.0095, lngOffset: -0.0270 },
      { name: 'Chapelle Obili', latOffset: -0.0110, lngOffset: -0.0285 },
      { name: 'Entrée Obili', latOffset: -0.0080, lngOffset: -0.0260 },
      { name: 'Total Obili Station', latOffset: -0.0090, lngOffset: -0.0280 }
    ]
  },
  mvan: {
    city: 'Yaoundé',
    locations: [
      { name: 'Mvan Bus Terminal (Gare routière)', latOffset: -0.0320, lngOffset: 0.0070 },
      { name: 'Carrefour Mvan', latOffset: -0.0310, lngOffset: 0.0090 },
      { name: 'Total Mvan', latOffset: -0.0300, lngOffset: 0.0080 },
      { name: 'Tradex Mvan Station', latOffset: -0.0330, lngOffset: 0.0060 },
      { name: 'Express Union Mvan Office', latOffset: -0.0325, lngOffset: 0.0075 }
    ]
  },
  mokolo: {
    city: 'Yaoundé',
    locations: [
      { name: 'Mokolo Market (Marché Mokolo)', latOffset: 0.0100, lngOffset: -0.0150 },
      { name: 'Carrefour Mokolo', latOffset: 0.0090, lngOffset: -0.0140 },
      { name: 'Sapeurs-Pompiers Mokolo', latOffset: 0.0110, lngOffset: -0.0170 },
      { name: 'Total Mokolo', latOffset: 0.0085, lngOffset: -0.0160 }
    ]
  },
  akwa: {
    city: 'Douala',
    locations: [
      { name: 'Akwa Palace Hotel, Blvd de la Liberté', latOffset: 0.0050, lngOffset: -0.0020 },
      { name: 'Total Akwa Station', latOffset: 0.0075, lngOffset: -0.0005 },
      { name: 'Marché Mboppi (Akwa)', latOffset: 0.0110, lngOffset: 0.0120 },
      { name: 'Boulevard de la Liberté (Akwa)', latOffset: 0.0030, lngOffset: -0.0040 },
      { name: 'Carrefour Douala Bercy (Akwa)', latOffset: 0.0085, lngOffset: -0.0010 }
    ]
  },
  deido: {
    city: 'Douala',
    locations: [
      { name: 'Deido Roundabout (Rond-point)', latOffset: 0.0185, lngOffset: 0.0096 },
      { name: 'Carrefour Deido', latOffset: 0.0170, lngOffset: 0.0110 },
      { name: 'Rue de la Joie (Deido)', latOffset: 0.0195, lngOffset: 0.0080 },
      { name: 'Ecole Publique Deido', latOffset: 0.0160, lngOffset: 0.0070 }
    ]
  },
  ndokoti: {
    city: 'Douala',
    locations: [
      { name: 'Ndokoti Junction (Carrefour)', latOffset: -0.0020, lngOffset: 0.0426 },
      { name: 'Total Ndokoti Station', latOffset: -0.0010, lngOffset: 0.0456 },
      { name: 'Gare Ferroviaire de Ndokoti', latOffset: -0.0040, lngOffset: 0.0410 },
      { name: 'SGC Ndokoti Bank', latOffset: -0.0025, lngOffset: 0.0435 }
    ]
  },
  bonamoussadi: {
    city: 'Douala',
    locations: [
      { name: 'Bonamoussadi Market (Marché)', latOffset: 0.0390, lngOffset: 0.0411 },
      { name: 'Carrefour Bonamoussadi', latOffset: 0.0405, lngOffset: 0.0426 },
      { name: 'Total Bonamoussadi Station', latOffset: 0.0375, lngOffset: 0.0395 },
      { name: 'Super U Bonamoussadi Mall', latOffset: 0.0420, lngOffset: 0.0430 }
    ]
  },
  logbessou: {
    city: 'Douala',
    locations: [
      { name: 'Logbessou University Campus', latOffset: 0.0345, lngOffset: 0.0716 },
      { name: 'Carrefour Logbessou', latOffset: 0.0360, lngOffset: 0.0730 },
      { name: 'Complexe Scolaire de Logbessou', latOffset: 0.0330, lngOffset: 0.0700 },
      { name: 'Total Logbessou Station', latOffset: 0.0350, lngOffset: 0.0750 }
    ]
  }
};

/**
 * Returns a smart, dynamically computed list of locations based on the typed query and city name.
 */
export function getSmartProposals(query: string, city: string): Location[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];

  const isYaounde = city.toLowerCase().includes('yaoundé') || city.toLowerCase().includes('yaounde');
  const baseLat = isYaounde ? 3.8612 : 4.0435;
  const baseLng = isYaounde ? 11.5175 : 9.6895;

  const results: Location[] = [];
  const addedNames = new Set<string>();

  const activeStaticList = isYaounde ? YAOUNDE_LOCATIONS : LAGOS_LOCATIONS;

  // 1. Check exact or partial matches from our static preset list
  activeStaticList.forEach(loc => {
    if (loc.name.toLowerCase().includes(normalizedQuery)) {
      results.push(loc);
      addedNames.add(loc.name);
    }
  });

  // 2. Scan for matches inside our dedicated neighborhood dictionary
  Object.keys(NEIGHBORHOOD_PROPOSALS).forEach(key => {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      const hub = NEIGHBORHOOD_PROPOSALS[key];
      const hubCityIsYaounde = hub.city === 'Yaoundé';
      if (hubCityIsYaounde === isYaounde) {
        hub.locations.forEach(sub => {
          if (!addedNames.has(sub.name)) {
            results.push({
              name: sub.name,
              lat: baseLat + sub.latOffset,
              lng: baseLng + sub.lngOffset
            });
            addedNames.add(sub.name);
          }
        });
      }
    }
  });

  // 3. Scan for core brand/location markers if they typed keywords like "Total", "Carrefour", "Marché"
  const brandKeywords = ['total', 'carrefour', 'marché', 'marche', 'station', 'stade', 'airport', 'aéroport', 'hotel', 'palace', 'campus', 'university', 'biyem', 'bastos', 'melen', 'mendong', 'obili'];
  const hasKeyword = brandKeywords.some(kw => normalizedQuery.includes(kw));

  if (hasKeyword) {
    const dynamicLandmarks = isYaounde ? [
      { name: `Total Bastos Station`, lat: 3.8950, lng: 11.5165 },
      { name: `Total Mendong Station`, lat: 3.8305, lng: 11.4895 },
      { name: `Total Melen Station`, lat: 3.8580, lng: 11.4940 },
      { name: `Total Biyem-Assi Station`, lat: 3.8360, lng: 11.4955 },
      { name: `Total Mvan Station`, lat: 3.8280, lng: 11.5205 },
      { name: `Carrefour Bastos`, lat: 3.8935, lng: 11.5150 },
      { name: `Carrefour Mendong`, lat: 3.8320, lng: 11.4880 },
      { name: `Carrefour Melen`, lat: 3.8595, lng: 11.4915 },
      { name: `Carrefour Obili`, lat: 3.8515, lng: 11.4860 },
      { name: `Carrefour Biyem-Assi`, lat: 3.8362, lng: 11.4950 },
      { name: `Carrefour Nlongkak`, lat: 3.8820, lng: 11.5240 },
      { name: `Carrefour Warda`, lat: 3.8680, lng: 11.5135 },
      { name: `Marché Central Yaoundé`, lat: 3.8655, lng: 11.5190 },
      { name: `Marché Mokolo`, lat: 3.8710, lng: 11.4980 },
      { name: `Marché de Biyem-Assi`, lat: 3.8340, lng: 11.4930 },
      { name: `Marché Mvog-Mbi`, lat: 3.8470, lng: 11.5225 }
    ] : [
      { name: `Total Akwa Station`, lat: 4.0510, lng: 9.6990 },
      { name: `Total Ndokoti Station`, lat: 4.0425, lng: 9.7450 },
      { name: `Total Bonamoussadi Station`, lat: 4.0810, lng: 9.7390 },
      { name: `Total Deido Station`, lat: 4.0610, lng: 9.7080 },
      { name: `Total Yassa Station`, lat: 4.0050, lng: 9.7820 },
      { name: `Carrefour Ndokoti`, lat: 4.0415, lng: 9.7420 },
      { name: `Carrefour Bonamoussadi`, lat: 4.0840, lng: 9.7420 },
      { name: `Carrefour Deido Rond-point`, lat: 4.0620, lng: 9.7090 },
      { name: `Carrefour Anatole (Akwa)`, lat: 4.0460, lng: 9.6945 },
      { name: `Carrefour Jocker`, lat: 4.0530, lng: 9.7320 },
      { name: `Marché Mboppi`, lat: 4.0545, lng: 9.7110 },
      { name: `Marché Bonamoussadi`, lat: 4.0825, lng: 9.7405 },
      { name: `Marché de Deido`, lat: 4.0645, lng: 9.7020 },
      { name: `Marché Sandaga`, lat: 4.0370, lng: 9.6840 }
    ];

    dynamicLandmarks.forEach(land => {
      if (land.name.toLowerCase().includes(normalizedQuery) && !addedNames.has(land.name)) {
        results.push(land);
        addedNames.add(land.name);
      }
    });
  }

  return results.slice(0, 8);
}
