import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'circle' | 'square' | 'pill' | 'star' | 'diamond';
  size: number;
  delay: number;
  duration: number;
}

const COLORS = [
  '#f59e0b', // Brand Gold / Amber
  '#10b981', // Emerald Green
  '#3b82f6', // Vivid Blue
  '#ec4899', // Pink / Rose
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Vibrant Orange
  '#ffffff', // White
  '#facc15', // Bright Yellow
];

interface ParticleExplosionProps {
  particleCount?: number;
}

export const ParticleExplosion: React.FC<ParticleExplosionProps> = ({ particleCount = 65 }) => {
  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => {
      // Angle anywhere around 360 degrees, with slight upward bias
      const angle = (Math.random() * Math.PI * 2);
      // Random velocity distance between 100px and 480px
      const distance = 100 + Math.random() * 380;
      
      const x = Math.cos(angle) * distance;
      // Add slight upward bias (-50 to -150) so explosion shoots up and arcs down
      const y = Math.sin(angle) * distance - (Math.random() * 120);
      
      const rotation = (Math.random() - 0.5) * 720;
      const scale = 0.6 + Math.random() * 0.9;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      const shapes: Particle['shape'][] = ['circle', 'square', 'pill', 'star', 'diamond'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      const size = 6 + Math.random() * 10;
      const delay = Math.random() * 0.25;
      const duration = 1.4 + Math.random() * 1.0;

      return {
        id: i,
        x,
        y,
        rotation,
        scale,
        color,
        shape,
        size,
        delay,
        duration,
      };
    });
  }, [particleCount]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[2500] flex items-center justify-center overflow-hidden">
      {/* Central Expanding Shockwave Ring 1 */}
      <motion.div
        initial={{ scale: 0, opacity: 0.9 }}
        animate={{ scale: [0, 2.5, 4], opacity: [0.9, 0.4, 0] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute w-40 h-40 rounded-full border-4 border-brand-gold shadow-[0_0_50px_rgba(245,158,11,0.6)]"
      />

      {/* Central Expanding Shockwave Ring 2 (Emerald) */}
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: [0, 1.8, 3.2], opacity: [0.8, 0.3, 0] }}
        transition={{ duration: 1.4, delay: 0.1, ease: 'easeOut' }}
        className="absolute w-32 h-32 rounded-full border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)]"
      />

      {/* Central Flash Glow */}
      <motion.div
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-brand-gold via-yellow-300 to-emerald-400 blur-xl"
      />

      {/* Particle Confetti Burst */}
      {particles.map((p) => {
        return (
          <motion.div
            key={p.id}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 0,
              rotate: 0,
            }}
            animate={{
              x: p.x,
              y: p.y + 120, // Gravity pull down effect
              opacity: [0, 1, 1, 0],
              scale: [0, p.scale, p.scale * 0.8, 0],
              rotate: p.rotation,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.22, 1, 0.36, 1], // Physics pop curve
            }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.shape === 'pill' ? p.size * 2.2 : p.size,
              backgroundColor: p.color,
              borderRadius:
                p.shape === 'circle'
                  ? '50%'
                  : p.shape === 'pill'
                  ? '9999px'
                  : p.shape === 'diamond'
                  ? '2px'
                  : '3px',
              transform: p.shape === 'diamond' ? 'rotate(45deg)' : undefined,
              boxShadow: `0 0 10px ${p.color}aa`,
            }}
          >
            {p.shape === 'star' && (
              <svg
                viewBox="0 0 24 24"
                fill={p.color}
                className="w-full h-full text-current"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
          </motion.div>
        );
      })}

      {/* Floating Sparkle Stars */}
      {Array.from({ length: 12 }).map((_, i) => {
        const xOffset = (Math.random() - 0.5) * 360;
        const yOffset = (Math.random() - 0.5) * 360;
        const delay = Math.random() * 0.4;
        return (
          <motion.div
            key={`sparkle-${i}`}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: xOffset,
              y: yOffset,
              opacity: [0, 1, 0],
              scale: [0, 1.4, 0],
            }}
            transition={{
              duration: 1.2,
              delay,
              ease: 'easeOut',
            }}
            className="absolute text-brand-gold drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
          >
            ✦
          </motion.div>
        );
      })}
    </div>
  );
};
