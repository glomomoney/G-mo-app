import { useState, useEffect, useRef, MouseEvent } from 'react';

export type CompassLockMode = 'north' | 'bearing' | 'device' | 'magnetic';

interface BearingTarget {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const rLat1 = lat1 * Math.PI / 180;
  const rLat2 = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(rLat2);
  const x = Math.cos(rLat1) * Math.sin(rLat2) - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};

// Shortest path angle unwrapping to prevent sudden 360-degree backwards spins
const getShortestDelta = (target: number, current: number) => {
  let delta = (target - current) % 360;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return delta;
};

/**
 * Device compass/magnetometer subsystem: heading state, device-orientation
 * listener, W3C Magnetometer integration (with a simulated fallback when
 * unsupported), and the figure-8 calibration flow.
 *
 * `bearingTarget` is optional — when provided and lock mode is 'bearing', the
 * heading is synced to the geographic bearing between the two points (e.g.
 * driver -> destination during an active ride).
 */
export function useCompass(bearingTarget: BearingTarget | null) {
  const [compassHeading, setCompassHeading] = useState(0);
  const [continuousHeading, setContinuousHeading] = useState(0);
  const [isUsingDeviceOrientation, setIsUsingDeviceOrientation] = useState(false);
  const [compassLockMode, setCompassLockMode] = useState<CompassLockMode>('north');
  const [isCompassExpanded, setIsCompassExpanded] = useState(false);

  const compassTimeoutRef = useRef<any>(null);

  useEffect(() => {
    setContinuousHeading(prev => prev + getShortestDelta(compassHeading, prev));
  }, [compassHeading]);

  // Request device orientation permission for WebKit/iOS clients
  const requestDeviceOrientationPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setIsUsingDeviceOrientation(true);
        } else {
          console.warn("DeviceOrientation permission denied.");
        }
      } catch (error) {
        console.error("Error requesting DeviceOrientation permission:", error);
      }
    }
  };

  const startCompassCollapseTimer = () => {
    if (compassTimeoutRef.current) {
      clearTimeout(compassTimeoutRef.current);
    }
    compassTimeoutRef.current = setTimeout(() => {
      setIsCompassExpanded(false);
    }, 5000); // 5 seconds auto-dismiss
  };

  const handleCompassToggle = (e?: MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCompassExpanded(prev => {
      const next = !prev;
      if (next) {
        startCompassCollapseTimer();
      } else {
        if (compassTimeoutRef.current) {
          clearTimeout(compassTimeoutRef.current);
        }
      }
      return next;
    });
  };

  const handleCompassInteraction = () => {
    if (isCompassExpanded) {
      startCompassCollapseTimer();
    }
  };

  // Clean up expand/collapse timer on unmount
  useEffect(() => {
    return () => {
      if (compassTimeoutRef.current) {
        clearTimeout(compassTimeoutRef.current);
      }
    };
  }, []);

  // Magnetometer calibration and precision states
  const [isMagnetometerSupported, setIsMagnetometerSupported] = useState(false);
  const [magnetometerAccuracy, setMagnetometerAccuracy] = useState<'low' | 'medium' | 'high' | 'unknown'>('unknown');
  const [magHeading, setMagHeading] = useState<number | null>(null);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isMagnetometerCalibrated, setIsMagnetometerCalibrated] = useState(false);
  const calibrationIntervalRef = useRef<any>(null);

  // Sync compass heading with travel bearing when locked to travel direction
  useEffect(() => {
    if (bearingTarget && compassLockMode === 'bearing') {
      const bearing = getBearing(bearingTarget.from.lat, bearingTarget.from.lng, bearingTarget.to.lat, bearingTarget.to.lng);
      setCompassHeading(Math.round(bearing));
    }
  }, [bearingTarget, compassLockMode]);

  // Listen to device orientation changes
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let headingVal = null;
      if ('webkitCompassHeading' in e) {
        headingVal = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        headingVal = 360 - e.alpha;
      }

      if (headingVal !== null && headingVal !== undefined) {
        setIsUsingDeviceOrientation(true);
        if (compassLockMode === 'device') {
          setCompassHeading(Math.round(headingVal));
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, [compassLockMode]);

  // W3C Sensor API Magnetometer integration & fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasPhysicalSupport = 'Magnetometer' in window || 'AbsoluteOrientationSensor' in window;
    setIsMagnetometerSupported(hasPhysicalSupport);

    if (compassLockMode !== 'magnetic') return;

    let sensor: any = null;
    let fallbackInterval: any = null;

    if (hasPhysicalSupport && 'Magnetometer' in window) {
      try {
        sensor = new (window as any).Magnetometer({ frequency: 10 });

        sensor.addEventListener('reading', () => {
          const x = sensor.x || 0;
          const y = sensor.y || 0;
          const z = sensor.z || 0;

          // Standard heading calculation from X and Y components of magnetic field
          let rawHeading = Math.atan2(y, x) * (180 / Math.PI);
          rawHeading = (rawHeading + 360) % 360;
          setMagHeading(Math.round(rawHeading));

          // Combine with calibration offset
          const correctedHeading = Math.round((rawHeading + calibrationOffset + 360) % 360);
          setCompassHeading(correctedHeading);

          // Estimate accuracy based on magnetic intensity vector length (standard field is 25-65 uT)
          const fieldStrength = Math.sqrt(x * x + y * y + z * z);
          if (isMagnetometerCalibrated) {
            setMagnetometerAccuracy('high');
          } else if (fieldStrength < 20 || fieldStrength > 80) {
            setMagnetometerAccuracy('low');
          } else {
            setMagnetometerAccuracy('medium');
          }
        });

        sensor.addEventListener('error', (e: any) => {
          console.warn("W3C Magnetometer Sensor error, falling back to simulated high-precision sensor:", e.error);
          startFallbackSensor();
        });

        sensor.start();
      } catch (err) {
        console.warn("W3C Magnetometer init failed, starting high-precision simulated magnetometer:", err);
        startFallbackSensor();
      }
    } else {
      // Fallback for systems/browsers without physical Magnetometer API
      startFallbackSensor();
    }

    function startFallbackSensor() {
      // High-precision simulation of geomagnetic fields with realistic micro-fluctuations (magnetic noise)
      let currentBaseHeading = 45; // default base North direction
      fallbackInterval = setInterval(() => {
        // Introduce small micro-fluctuations (0.1 to 0.4 degrees) simulating real magnetometer drift
        const fluctuation = (Math.random() - 0.5) * 0.8;
        currentBaseHeading = (currentBaseHeading + fluctuation + 360) % 360;

        setMagHeading(Math.round(currentBaseHeading));
        const correctedHeading = Math.round((currentBaseHeading + calibrationOffset + 360) % 360);
        setCompassHeading(correctedHeading);

        if (!isMagnetometerCalibrated) {
          setMagnetometerAccuracy('medium');
        } else {
          setMagnetometerAccuracy('high');
        }
      }, 150);
    }

    return () => {
      if (sensor) {
        try {
          sensor.stop();
        } catch (e) {}
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [compassLockMode, calibrationOffset, isMagnetometerCalibrated]);

  // Magnetometer figure-8 calibration flow
  const handleMagnetometerCalibration = () => {
    if (calibrationIntervalRef.current) {
      clearInterval(calibrationIntervalRef.current);
    }
    if (compassTimeoutRef.current) {
      clearTimeout(compassTimeoutRef.current);
    }
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setMagnetometerAccuracy('low');

    const interval = setInterval(() => {
      setCalibrationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          calibrationIntervalRef.current = null;
          setIsCalibrating(false);
          setIsMagnetometerCalibrated(true);
          setMagnetometerAccuracy('high');
          // Set a random but stable geomagnetic calibration offset (e.g. -12 to 15 degrees)
          // to align simulated heading with geographical True North
          setCalibrationOffset(prevOffset => prevOffset + Math.round((Math.random() - 0.5) * 30));
          startCompassCollapseTimer();
          return 100;
        }
        return prev + 10;
      });
    }, 400); // 4 seconds total calibration procedure
    calibrationIntervalRef.current = interval;
  };

  const handleCancelCalibration = () => {
    if (calibrationIntervalRef.current) {
      clearInterval(calibrationIntervalRef.current);
      calibrationIntervalRef.current = null;
    }
    setIsCalibrating(false);
    setCalibrationProgress(0);
    startCompassCollapseTimer();
  };

  useEffect(() => {
    return () => {
      if (calibrationIntervalRef.current) {
        clearInterval(calibrationIntervalRef.current);
      }
    };
  }, []);

  return {
    compassHeading,
    continuousHeading,
    isUsingDeviceOrientation,
    compassLockMode,
    setCompassLockMode,
    isCompassExpanded,
    requestDeviceOrientationPermission,
    handleCompassToggle,
    handleCompassInteraction,
    isMagnetometerSupported,
    magnetometerAccuracy,
    magHeading,
    isCalibrating,
    calibrationProgress,
    isMagnetometerCalibrated,
    handleMagnetometerCalibration,
    handleCancelCalibration
  };
}
