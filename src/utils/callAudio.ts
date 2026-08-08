// Web Audio API & Vibration API helper for authentic in-app calling ringtones & vibration

class CallRingtonePlayer {
  private audioCtx: AudioContext | null = null;
  private isRinging: boolean = false;
  private ringInterval: any = null;
  private vibrateInterval: any = null;

  private initCtx() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  // Play standard incoming telephone ringtone (853Hz + 960Hz dual frequency)
  public startIncomingRingtone() {
    this.stop();
    this.initCtx();
    this.isRinging = true;

    // Trigger vibration if supported
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([800, 400, 800, 400, 800]);
        this.vibrateInterval = setInterval(() => {
          if (this.isRinging) {
            navigator.vibrate([800, 400, 800, 400, 800]);
          }
        }, 3200);
      } catch (e) {
        console.warn('Vibration API error:', e);
      }
    }

    // Play tone burst (1.8s duration every 3s)
    const playBurst = () => {
      if (!this.isRinging || !this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(853, now);
        osc2.frequency.setValueAtTime(960, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
      } catch (e) {
        console.warn('Web Audio error:', e);
      }
    };

    playBurst();
    this.ringInterval = setInterval(playBurst, 3000);
  }

  // Play standard outgoing ringback tone (440Hz + 480Hz dual frequency)
  public startOutgoingRingback() {
    this.stop();
    this.initCtx();
    this.isRinging = true;

    const playBurst = () => {
      if (!this.isRinging || !this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
      } catch (e) {
        console.warn('Web Audio error:', e);
      }
    };

    playBurst();
    this.ringInterval = setInterval(playBurst, 3500);
  }

  // Play short connect audio tone
  public playConnectTone() {
    this.stop();
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Web Audio connect error:', e);
    }
  }

  // Stop all ringtones and vibration
  public stop() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.vibrateInterval) {
      clearInterval(this.vibrateInterval);
      this.vibrateInterval = null;
    }
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(0);
      } catch (e) {
        // ignore
      }
    }
  }
}

export const callRingtonePlayer = new CallRingtonePlayer();
