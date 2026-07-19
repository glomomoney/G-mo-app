import React from 'react';

interface WandaLogoProps {
  className?: string;
}

export default function WandaLogo({ className = "w-10 h-10" }: WandaLogoProps) {
  return (
    <svg viewBox="0 0 500 500" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" id="wanda-logo-svg">
      <defs>
        {/* Indigo-Purple metallic gradient for the location pin backdrop */}
        <linearGradient id="pinGrad" x1="250" y1="20" x2="250" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4c3cb3" />
          <stop offset="50%" stopColor="#1e1853" />
          <stop offset="100%" stopColor="#080614" />
        </linearGradient>
        
        {/* High-glow gold gradient for the winged W */}
        <linearGradient id="goldGrad" x1="250" y1="120" x2="250" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF4D0" />
          <stop offset="30%" stopColor="#ffd385" />
          <stop offset="70%" stopColor="#b8924e" />
          <stop offset="100%" stopColor="#614613" />
        </linearGradient>

        {/* Gold road center line glow */}
        <linearGradient id="roadLineGrad" x1="250" y1="280" x2="250" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd385" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffd385" stopOpacity="0.2" />
        </linearGradient>

        {/* Dark road asphalt gradient */}
        <linearGradient id="roadGrad" x1="250" y1="280" x2="250" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#181335" />
          <stop offset="100%" stopColor="#05030e" />
        </linearGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outline glowing ring */}
      <path
        d="M250,20 C125,20 25,120 25,245 C25,320 80,395 250,480 C420,395 475,320 475,245 C475,120 375,20 250,20 Z"
        fill="url(#pinGrad)"
        stroke="#ffd385"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Internal road stretching down */}
      <path
        d="M190,280 C210,350 215,410 130,480 L370,480 C285,410 290,350 310,280 Z"
        fill="url(#roadGrad)"
        stroke="#4c3cb3"
        strokeWidth="2"
      />

      {/* Center dashed road lines in gold */}
      <path
        d="M250,280 Q253,380 250,480"
        stroke="url(#roadLineGrad)"
        strokeWidth="8"
        strokeDasharray="15,15"
        strokeLinecap="round"
      />

      {/* Winged W glowing in the center */}
      <g filter="url(#glow)">
        {/* Left Wing */}
        <path
          d="M90,220 C130,225 160,280 190,295 C205,300 215,280 220,260 C230,220 235,160 250,160 C265,160 270,220 280,260 C285,280 295,300 310,295 C340,280 370,225 410,220 C370,270 330,340 250,340 C170,340 130,270 90,220 Z"
          fill="url(#goldGrad)"
        />
      </g>
    </svg>
  );
}
