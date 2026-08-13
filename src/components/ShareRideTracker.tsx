import { RideStatus, RecentBooking } from '../types';
import WandaLogo from './WandaLogo';
import TaxiMap from './TaxiMap';

interface ShareRideData {
  shareRideId: string;
  passengerName: string;
  driverName: string;
  pickupName: string;
  destName: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  driverLat: number;
  driverLng: number;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleType: string;
  status: string;
}

interface ShareRideTrackerProps {
  shareRideData: ShareRideData;
  slangMode: boolean;
  liveStatus: RideStatus;
  liveDriverLoc: { lat: number; lng: number } | null;
  isMapTilted: boolean | 'flat' | 'isometric' | 'tilted';
  isZoomLocked: boolean;
  showMapGrid: boolean;
  recentBookings: RecentBooking[];
}

export default function ShareRideTracker({
  shareRideData,
  slangMode,
  liveStatus,
  liveDriverLoc,
  isMapTilted,
  isZoomLocked,
  showMapGrid,
  recentBookings,
}: ShareRideTrackerProps) {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-brand-midnight text-white select-none overflow-hidden font-sans" id="shared-ride-tracker">
      {/* Left pane: Ride details / status */}
      <div className="w-full md:w-[380px] bg-brand-deep border-b md:border-b-0 md:border-r border-brand-card/80 flex flex-col justify-between shrink-0 h-2/5 md:h-full z-20 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="p-4 bg-brand-midnight/40 border-b border-brand-card/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WandaLogo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(226,193,141,0.25)] animate-pulse" />
            <div>
              <h1 className="text-xs font-black text-brand-gold uppercase tracking-widest">
                Wanda Share Track
              </h1>
              <p className="text-[9px] text-brand-text-muted font-bold italic">Suivi de trajet en direct 📡</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[9px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-2 py-0.5 rounded-full font-black uppercase">
              {slangMode ? "EN DIRECT" : "LIVE"}
            </span>
          </div>
        </div>

        {/* Active tracking info */}
        <div className="p-4 space-y-4 flex-1">
          {/* Status notification */}
          <div className="bg-brand-card/30 border border-brand-card rounded-2xl p-3.5 space-y-1 shadow-inner">
            <span className="text-[8px] uppercase font-black text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded-md inline-block animate-pulse">
              {liveStatus === 'driver_found' ? (slangMode ? "CHAUFFEUR EN ROUTE" : "DRIVER ASSIGNED") :
               liveStatus === 'arriving' ? (slangMode ? "CHAUFFEUR ARRIVE" : "DRIVER ARRIVING") :
               liveStatus === 'in_progress' ? (slangMode ? "TRAJET EN COURS" : "RIDE IN PROGRESS") :
               (slangMode ? "ARRIVÉ À DESTINATION" : "ARRIVED")}
            </span>
            <h3 className="text-xs font-black text-white">
              {liveStatus === 'driver_found' && (slangMode ? "Le chauffeur s'approche du point d'embarquement" : "Driver is heading to the pickup point")}
              {liveStatus === 'arriving' && (slangMode ? "Le chauffeur est arrivé à l'embarquement" : "Driver has arrived at the pickup location")}
              {liveStatus === 'in_progress' && (slangMode ? "En route vers la destination finale" : "En route to the final destination")}
              {liveStatus === 'completed' && (slangMode ? "Le voyage s'est terminé avec succès" : "The journey has successfully concluded")}
            </h3>
            <p className="text-[10px] text-brand-text-muted font-semibold">
              {slangMode
                ? "Partagé en toute sécurité par votre proche."
                : "Shared securely by your friend/family member."}
            </p>
          </div>

          {/* Rider & Driver Cards */}
          <div className="space-y-2.5">
            <div className="bg-brand-card/20 border border-brand-card/40 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-card border border-brand-input flex items-center justify-center text-sm font-bold text-brand-gold">
                  👤
                </div>
                <div>
                  <span className="text-[8px] text-brand-text-muted block font-bold uppercase">{slangMode ? "Passager" : "Passenger"}</span>
                  <h4 className="text-xs font-black text-white">{shareRideData.passengerName}</h4>
                </div>
              </div>
            </div>

            <div className="bg-brand-card/20 border border-brand-card/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-sm font-bold text-brand-gold">
                    🚗
                  </div>
                  <div>
                    <span className="text-[8px] text-brand-text-muted block font-bold uppercase">{slangMode ? "Chauffeur" : "Driver"}</span>
                    <h4 className="text-xs font-black text-white">{shareRideData.driverName}</h4>
                  </div>
                </div>
                <span className="text-[10px] text-brand-gold font-bold bg-brand-midnight px-2 py-0.5 rounded border border-brand-card">
                  ★ 4.9
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-input/30 text-[10px] font-semibold text-brand-text-muted">
                <div>
                  <span className="text-[8px] block uppercase text-brand-text-muted/70">{slangMode ? "Véhicule" : "Vehicle"}</span>
                  <span className="text-white font-extrabold">{shareRideData.vehicleModel}</span>
                </div>
                <div>
                  <span className="text-[8px] block uppercase text-brand-text-muted/70">{slangMode ? "Immatriculation" : "Plate No"}</span>
                  <span className="text-brand-gold font-extrabold font-mono bg-brand-midnight px-1.5 py-0.5 rounded border border-brand-card inline-block">{shareRideData.vehiclePlate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Itinerary details */}
          <div className="bg-brand-card/20 border border-brand-card/40 rounded-xl p-3.5 space-y-2.5 text-[11px] font-semibold">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse"></span>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] text-brand-text-muted block uppercase font-black">{slangMode ? "Départ (A)" : "Pickup (A)"}</span>
                <p className="font-extrabold text-white truncate">{shareRideData.pickupName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-1"></span>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] text-brand-text-muted block uppercase font-black">{slangMode ? "Arrivée (B)" : "Destination (B)"}</span>
                <p className="font-extrabold text-white truncate">{shareRideData.destName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Call To Action */}
        <div className="p-4 bg-brand-midnight/60 border-t border-brand-card/80 space-y-2">
          <p className="text-[10px] text-brand-text-muted font-bold text-center">
            {slangMode ? "Besoin de voyager en sécurité au Cameroun ?" : "Want safe, reliable rides in Cameroon?"}
          </p>
          <button
            onClick={() => {
              // Clear query params to return to main application
              window.location.href = window.location.origin;
            }}
            className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black text-xs py-2.5 rounded-xl shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            🚀 {slangMode ? "Commander mon trajet sur Wanda" : "Book Your Own Wanda Ride"}
          </button>
        </div>
      </div>

      {/* Right pane: Leaflet map view */}
      <div className="flex-1 h-3/5 md:h-full relative z-10">
        <TaxiMap
          pickup={{ name: shareRideData.pickupName, lat: shareRideData.pickupLat, lng: shareRideData.pickupLng }}
          destination={{ name: shareRideData.destName, lat: shareRideData.destLat, lng: shareRideData.destLng }}
          driverLocation={liveDriverLoc}
          status={liveStatus}
          driverType={shareRideData.vehicleType}
          role="passenger"
          slangMode={slangMode}
          isTilted={isMapTilted}
          isZoomLocked={isZoomLocked}
          showMapGrid={showMapGrid}
          recentBookings={recentBookings}
        />
      </div>
    </div>
  );
}
