import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation } from 'lucide-react';
import { getSmartProposals } from '../utils/autocomplete';
import { Location } from '../types';

interface LocationSearchModalProps {
  searchModalType: 'pickup' | 'destination' | null;
  setSearchModalType: (type: 'pickup' | 'destination' | null) => void;
  slangMode: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentCity: string;
  activeCityLocations: Location[];
  geolocateCurrentPosition: (onDone?: (location: Location) => void) => void;
  isGeolocating: boolean;
  setPickup: (loc: Location | null) => void;
  setDestination: (loc: Location | null) => void;
}

export default function LocationSearchModal({
  searchModalType,
  setSearchModalType,
  slangMode,
  searchQuery,
  setSearchQuery,
  currentCity,
  activeCityLocations,
  geolocateCurrentPosition,
  isGeolocating,
  setPickup,
  setDestination,
}: LocationSearchModalProps) {
  return (
      <AnimatePresence>
        {searchModalType && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4">
            {/* Blur backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-md cursor-pointer"
              onClick={() => setSearchModalType(null)}
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              className="relative w-full max-w-lg bg-brand-card border-2 border-brand-gold/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col mt-4 md:mt-[8%] max-h-[85vh] md:max-h-[65vh]"
              id="smart-search-overlay"
            >
              {/* Header */}
              <div className="p-4 border-b border-brand-input bg-brand-midnight/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-brand-gold tracking-widest flex items-center gap-1.5">
                    🔍 {searchModalType === 'pickup' 
                      ? (slangMode ? "POINT DE RAMASSAGE" : "PICKUP LOCATION") 
                      : (slangMode ? "LIEU DE DESTINATION" : "DESTINATION POINT")
                    }
                  </h3>
                  <p className="text-[10px] text-brand-text-muted font-bold">
                    {slangMode ? "Saisis un nom, carrefour, quartier ou station" : "Enter street, neighborhood, market or brand"}
                  </p>
                </div>
                <button 
                  onClick={() => setSearchModalType(null)}
                  className="w-7 h-7 bg-brand-input hover:bg-brand-gold/15 border border-brand-input text-brand-text-muted hover:text-white rounded-lg flex items-center justify-center text-xs font-black cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* Input bar */}
              <div className="p-3 bg-brand-deep border-b border-brand-input relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchModalType === 'pickup'
                    ? (slangMode ? "Saisis un lieu (ex: Bastos, Melen, Total...)" : "Type pickup station...")
                    : (slangMode ? "Saisis un lieu (ex: Ndokoti, Akwa, Biyem Assi...)" : "Type destination...")
                  }
                  className="w-full bg-brand-input border-2 border-brand-card focus:border-brand-gold/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none transition shadow-inner font-semibold"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] bg-brand-card hover:bg-brand-input text-brand-text-muted px-2 py-1 rounded cursor-pointer font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Proposals list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[45vh] md:max-h-[35vh]">
                {(() => {
                  const proposals = searchQuery 
                    ? getSmartProposals(searchQuery, currentCity) 
                    : activeCityLocations;

                  if (proposals.length === 0) {
                    return (
                      <div className="p-6 text-center space-y-2">
                        <p className="text-xs text-brand-text-muted font-bold">Aucune proposition trouvée</p>
                        <p className="text-[10px] text-brand-text-muted/70">Continuez à saisir pour créer une station personnalisée</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Live GPS standing position detector row */}
                      <button
                        type="button"
                        onClick={() => {
                          geolocateCurrentPosition(() => {
                            setSearchModalType(null);
                          });
                        }}
                        disabled={isGeolocating}
                        className="w-full text-left px-3.5 py-3 rounded-xl text-xs bg-brand-gold/10 hover:bg-brand-gold/20 border-2 border-dashed border-brand-gold/30 hover:border-brand-gold flex items-center justify-between gap-3 cursor-pointer transition font-bold group mb-3 text-brand-gold"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-5 h-5 rounded bg-brand-gold/20 flex items-center justify-center shrink-0 animate-pulse text-[11px]">
                            🎯
                          </div>
                          <div className="truncate">
                            <p className="font-extrabold text-[12px] text-brand-gold group-hover:text-white leading-tight">
                              {isGeolocating 
                                ? (slangMode ? "Détection GPS debout en cours..." : "Retrieving GPS standing position...")
                                : (slangMode ? "Géolocaliser ma position debout (GPS)" : "Geolocate My Standing Position (GPS)")
                              }
                            </p>
                            <p className="text-[9.5px] text-brand-text-muted group-hover:text-slate-300 font-medium truncate">
                              {slangMode 
                                ? "Mets à jour ton point de départ avec ton GPS live exact" 
                                : "Set your exact live coordinate as the pickup point"
                              }
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-brand-gold group-hover:text-white font-black pr-1 shrink-0">
                          {slangMode ? "GPS live ➔" : "Acquire GPS ➔"}
                        </span>
                      </button>

                      <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase text-brand-gold/70 tracking-widest flex items-center justify-between">
                        <span>{searchQuery ? "Propositions Intelligentes" : "Stations Populaires"}</span>
                        <span className="text-[8px] px-1 bg-brand-gold/10 text-brand-gold rounded border border-brand-gold/10 font-black">
                          {currentCity.toUpperCase()}
                        </span>
                      </div>

                      {proposals.map((loc, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (searchModalType === 'pickup') {
                              setPickup(loc);
                            } else {
                              setDestination(loc);
                            }
                            setSearchModalType(null);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-brand-text-muted hover:bg-brand-gold/10 hover:text-white border border-transparent hover:border-brand-gold/30 flex items-center justify-between gap-3 cursor-pointer transition font-medium group"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {searchModalType === 'pickup' ? (
                              <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                <MapPin size={11} className="text-emerald-400" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
                                <Navigation size={11} className="text-brand-gold rotate-45" />
                              </div>
                            )}
                            <div className="truncate">
                              <p className="font-extrabold text-white text-[12px] group-hover:text-brand-gold truncate leading-tight">
                                {loc.name}
                              </p>
                              <p className="text-[9px] text-brand-text-muted group-hover:text-slate-300 font-mono">
                                Lat: {loc.lat.toFixed(4)}, Lng: {loc.lng.toFixed(4)}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-brand-gold opacity-0 group-hover:opacity-100 transition font-black pr-1 shrink-0">
                            Sélectionner ➔
                          </span>
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
              
              {/* Quick Suggestions presets shortcuts bar */}
              <div className="p-3 border-t border-brand-input bg-brand-midnight/90 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold shrink-0">
                <span className="text-brand-text-muted shrink-0 text-[9px] uppercase font-black">Raccourcis:</span>
                {(currentCity.toLowerCase().includes('douala') 
                  ? ['Akwa', 'Ndokoti', 'Deido', 'Bonamoussadi', 'Total', 'Mall'] 
                  : ['Bastos', 'Melen', 'Mendong', 'Obili', 'Total', 'Mokolo']
                ).map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSearchQuery(preset)}
                    className="px-2 py-1 bg-brand-input hover:bg-brand-gold border border-brand-card hover:text-brand-midnight rounded-lg text-white font-black cursor-pointer transition text-[10.5px] shrink-0"
                  >
                    #{preset}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}
