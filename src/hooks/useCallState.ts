import { useState, useEffect } from 'react';
import { callRingtonePlayer } from '../utils/callAudio';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active';
export type CallSender = 'passenger' | 'driver';

/**
 * In-app call UI: ringtone/vibration, simulated answer timing, duration timer,
 * and mute/speaker toggles. Purely local UI state — no Firebase backing.
 */
export function useCallState() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callSender, setCallSender] = useState<CallSender>('passenger');
  const [callDuration, setCallDuration] = useState(0);
  const [showCallDropdown, setShowCallDropdown] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // Call Duration timer
  useEffect(() => {
    let interval: any = null;
    if (callState === 'active') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Real Web Audio Ringtone & Vibration effect for in-app calls
  useEffect(() => {
    if (callState === 'incoming') {
      callRingtonePlayer.startIncomingRingtone();
    } else if (callState === 'outgoing') {
      callRingtonePlayer.startOutgoingRingback();
    } else if (callState === 'active') {
      callRingtonePlayer.playConnectTone();
    } else {
      callRingtonePlayer.stop();
    }

    return () => {
      callRingtonePlayer.stop();
    };
  }, [callState]);

  // Simulate the other party answering an outgoing call
  useEffect(() => {
    let timeout: any = null;
    if (callState === 'outgoing') {
      timeout = setTimeout(() => {
        setCallState('active');
      }, 2500);
    }
    return () => clearTimeout(timeout);
  }, [callState]);

  const startInAppCall = (sender: CallSender) => {
    setCallSender(sender);
    setCallState('outgoing');
    setIsMuted(false);
    setIsSpeaker(false);
    setShowCallDropdown(false);
  };

  const receiveInAppCall = (sender: CallSender) => {
    setCallSender(sender);
    setCallState('incoming');
    setIsMuted(false);
    setIsSpeaker(false);
    setShowCallDropdown(false);
  };

  const answerInAppCall = () => {
    setCallState('active');
  };

  const declineInAppCall = () => {
    callRingtonePlayer.stop();
    setCallState('idle');
  };

  const endInAppCall = () => {
    callRingtonePlayer.stop();
    setCallState('idle');
  };

  return {
    callState,
    callSender,
    callDuration,
    showCallDropdown,
    setShowCallDropdown,
    isMuted,
    setIsMuted,
    isSpeaker,
    setIsSpeaker,
    startInAppCall,
    receiveInAppCall,
    answerInAppCall,
    declineInAppCall,
    endInAppCall
  };
}
