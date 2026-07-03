import React from 'react';

interface PetSVGProps {
  species: string; // 'cat' | 'dog' | 'rabbit' | 'fox' | 'panda' | 'bear'
  color: string;   // hex string like '#FFB085'
  state: 'idle' | 'walk' | 'sit' | 'speak' | 'eat' | 'sleep' | 'play' | 'hibernate';
  equippedAccessories?: string[]; // 'hat' | 'ribbon' | 'glasses' | 'collar' | 'scarf' | 'wings'
  activeEffects?: string[];      // 'hearts' | 'stars' | 'snow' | 'bubbles' | 'flowers' | 'leaves'
}

export const PetSVG: React.FC<PetSVGProps> = ({
  species,
  color,
  state,
  equippedAccessories = [],
  activeEffects = []
}) => {
  // Normalize parameters
  const animal = species.toLowerCase();
  const primaryColor = color || '#FFB085';

  // Base keyframes and style generation embedded inside the SVG for seamless resolution-independent performance
  const styleContent = `
    @keyframes pet-idle-bounce {
      0%, 100% { transform: translateY(0px) scaleY(1); }
      50% { transform: translateY(4px) scaleY(0.96); }
    }
    @keyframes pet-walk-bounce {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      25% { transform: translateY(-8px) rotate(-3deg); }
      50% { transform: translateY(0px) rotate(0deg); }
      75% { transform: translateY(-8px) rotate(3deg); }
    }
    @keyframes pet-play-bounce {
      0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
      30% { transform: translateY(-16px) scale(1.08) rotate(15deg); }
      60% { transform: translateY(0px) scale(0.95) rotate(-5deg); }
    }
    @keyframes pet-sleep-breathing {
      0%, 100% { transform: translateY(0px) scaleY(1); }
      50% { transform: translateY(2px) scaleY(0.98); }
    }
    @keyframes pet-hibernate-breathing {
      0%, 100% { transform: translateY(1px) scaleY(0.95) scaleX(0.97); opacity: 0.6; }
      50% { transform: translateY(3px) scaleY(0.91) scaleX(0.94); opacity: 0.8; }
    }
    @keyframes pet-tail-wag {
      0%, 100% { transform: rotate(-5deg); }
      50% { transform: rotate(15deg); }
    }
    @keyframes pet-tail-fast-wag {
      0%, 100% { transform: rotate(-10deg); }
      50% { transform: rotate(30deg); }
    }
    @keyframes pet-eye-blink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }
    @keyframes pet-mouth-speak {
      0%, 100% { transform: scaleY(0.2); }
      50% { transform: scaleY(1.5); }
    }
    @keyframes pet-mouth-eat {
      0%, 100% { transform: scaleY(0.1) scaleX(0.8); }
      50% { transform: scaleY(2) scaleX(1.3); }
    }
    @keyframes pet-wings-flap {
      0%, 100% { transform: scaleX(1) rotate(0deg); }
      50% { transform: scaleX(0.6) rotate(-10deg); }
    }
    @keyframes pet-stars-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pet-heart-float {
      0% { transform: translateY(0px) scale(0.6); opacity: 0; }
      50% { opacity: 0.8; }
      100% { transform: translateY(-20px) scale(1); opacity: 0; }
    }

    .body-group {
      transform-origin: 100px 150px;
    }
    .head-group {
      transform-origin: 100px 100px;
    }
    .tail-group {
      transform-origin: 135px 145px;
    }
    .wing-l {
      transform-origin: 55px 120px;
    }
    .wing-r {
      transform-origin: 145px 120px;
    }
    .left-eye, .right-eye {
      transform-origin: 80px 100px;
    }
    .right-eye {
      transform-origin: 120px 100px;
    }
    .mouth {
      transform-origin: 100px 112px;
    }

    /* State mappings */
    .state-idle .body-group {
      animation: pet-idle-bounce 2.5s ease-in-out infinite;
    }
    .state-idle .tail-group {
      animation: pet-tail-wag 1.8s ease-in-out infinite;
    }
    .state-idle .left-eye, .state-idle .right-eye {
      animation: pet-eye-blink 4s infinite;
    }

    .state-walk .body-group {
      animation: pet-walk-bounce 0.8s ease-in-out infinite;
    }
    .state-walk .tail-group {
      animation: pet-tail-fast-wag 0.5s ease-in-out infinite;
    }
    .state-walk .left-eye, .state-walk .right-eye {
      animation: pet-eye-blink 2.5s infinite;
    }

    .state-sit .body-group {
      transform: translateY(6px) scaleY(0.94);
    }
    .state-sit .tail-group {
      animation: pet-tail-wag 3s ease-in-out infinite;
    }
    .state-sit .left-eye, .state-sit .right-eye {
      animation: pet-eye-blink 5s infinite;
    }

    .state-speak .body-group {
      animation: pet-idle-bounce 1.5s ease-in-out infinite;
    }
    .state-speak .tail-group {
      animation: pet-tail-wag 1.2s ease-in-out infinite;
    }
    .state-speak .mouth {
      animation: pet-mouth-speak 0.25s infinite;
    }
    .state-speak .left-eye, .state-speak .right-eye {
      animation: pet-eye-blink 3s infinite;
    }

    .state-eat .body-group {
      animation: pet-idle-bounce 1s ease-in-out infinite;
    }
    .state-eat .tail-group {
      animation: pet-tail-fast-wag 0.4s ease-in-out infinite;
    }
    .state-eat .mouth {
      animation: pet-mouth-eat 0.2s infinite;
    }

    .state-sleep .body-group {
      animation: pet-sleep-breathing 4s ease-in-out infinite;
    }
    .state-sleep .tail-group {
      transform: rotate(-10deg);
    }

    .state-hibernate .body-group {
      animation: pet-hibernate-breathing 5.5s ease-in-out infinite;
      filter: grayscale(60%) brightness(70%);
    }
    .state-hibernate .tail-group {
      transform: rotate(-15deg);
    }

    .state-play .body-group {
      animation: pet-play-bounce 0.65s ease-in-out infinite;
    }
    .state-play .tail-group {
      animation: pet-tail-fast-wag 0.3s ease-in-out infinite;
    }

    /* Accessories */
    .wing-group {
      animation: pet-wings-flap 1.5s ease-in-out infinite;
    }
  `;

  // Colors configurations based on animal
  const earColor = '#FCA5A5'; // Pinkish inside
  const cheeksColor = '#FCA5A5';
  const chestColor = '#FFFFFF';
  const snoutColor = '#F1F5F9';
  const tailColor = primaryColor;

  // Render Animal-Specific Head details (triangular ears for cat, floppy ears for dog, tall for rabbit, etc.)
  const renderEars = () => {
    switch (animal) {
      case 'cat':
        return (
          <>
            {/* Left ear */}
            <path d="M 60 75 L 45 40 L 80 65 Z" fill={primaryColor} stroke="#1E293B" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 63 70 L 52 46 L 75 62 Z" fill={earColor} />
            {/* Right ear */}
            <path d="M 140 75 L 155 40 L 120 65 Z" fill={primaryColor} stroke="#1E293B" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 137 70 L 148 46 L 125 62 Z" fill={earColor} />
          </>
        );
      case 'dog':
        return (
          <>
            {/* Left floppy ear */}
            <rect x="42" y="65" width="22" height="45" rx="10" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" transform="rotate(12 53 87)" />
            <rect x="46" y="70" width="14" height="35" rx="7" fill={earColor} transform="rotate(12 53 87)" />
            {/* Right floppy ear */}
            <rect x="136" y="65" width="22" height="45" rx="10" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" transform="rotate(-12 147 87)" />
            <rect x="140" y="70" width="14" height="35" rx="7" fill={earColor} transform="rotate(-12 147 87)" />
          </>
        );
      case 'rabbit':
        return (
          <>
            {/* Left Tall ear */}
            <rect x="62" y="15" width="20" height="60" rx="10" fill={primaryColor} stroke="#1E293B" strokeWidth="3" transform="rotate(-8 72 45)" />
            <rect x="67" y="22" width="10" height="46" rx="5" fill={earColor} transform="rotate(-8 72 45)" />
            {/* Right Tall ear */}
            <rect x="118" y="15" width="20" height="60" rx="10" fill={primaryColor} stroke="#1E293B" strokeWidth="3" transform="rotate(8 128 45)" />
            <rect x="123" y="22" width="10" height="46" rx="5" fill={earColor} transform="rotate(8 128 45)" />
          </>
        );
      case 'fox':
        return (
          <>
            {/* Left large triangle ear */}
            <path d="M 55 75 L 35 30 L 85 62 Z" fill="#EA580C" stroke="#1E293B" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 58 70 L 44 40 L 78 60 Z" fill={earColor} />
            {/* Right large triangle ear */}
            <path d="M 145 75 L 165 30 L 115 62 Z" fill="#EA580C" stroke="#1E293B" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 142 70 L 156 40 L 122 60 Z" fill={earColor} />
          </>
        );
      case 'panda':
        return (
          <>
            {/* Round left black ear */}
            <circle cx="60" cy="55" r="18" fill="#1E293B" stroke="#0F172A" strokeWidth="2.5" />
            <circle cx="60" cy="55" r="10" fill="#0F172A" />
            {/* Round right black ear */}
            <circle cx="140" cy="55" r="18" fill="#1E293B" stroke="#0F172A" strokeWidth="2.5" />
            <circle cx="140" cy="55" r="10" fill="#0F172A" />
          </>
        );
      case 'bear':
        default:
        return (
          <>
            {/* Round left brown ear */}
            <circle cx="62" cy="60" r="16" fill={primaryColor} stroke="#1E293B" strokeWidth="3" />
            <circle cx="62" cy="60" r="9" fill={earColor} />
            {/* Round right brown ear */}
            <circle cx="138" cy="60" r="16" fill={primaryColor} stroke="#1E293B" strokeWidth="3" />
            <circle cx="138" cy="60" r="9" fill={earColor} />
          </>
        );
    }
  };

  const renderFaceAccents = () => {
    switch (animal) {
      case 'cat':
        return (
          <>
            {/* Whiskers Left */}
            <line x1="55" y1="110" x2="35" y2="108" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            <line x1="55" y1="115" x2="32" y2="117" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            {/* Whiskers Right */}
            <line x1="145" y1="110" x2="165" y2="108" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            <line x1="145" y1="115" x2="168" y2="117" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            {/* Tiny cat nose */}
            <path d="M 96 110 L 104 110 L 100 114 Z" fill="#E11D48" />
          </>
        );
      case 'fox':
        return (
          <>
            {/* White cheeks patches */}
            <path d="M 60 110 C 60 125, 80 128, 90 120 C 80 115, 65 110, 60 110 Z" fill="#FFFFFF" />
            <path d="M 140 110 C 140 125, 120 128, 110 120 C 120 115, 135 110, 140 110 Z" fill="#FFFFFF" />
            {/* Cute black fox nose */}
            <circle cx="100" cy="113" r="3" fill="#1E293B" />
          </>
        );
      case 'panda':
        return (
          <>
            {/* Big black eye patches */}
            <ellipse cx="80" cy="100" rx="12" ry="15" fill="#1E293B" transform="rotate(-15 80 100)" />
            <ellipse cx="120" cy="100" rx="12" ry="15" fill="#1E293B" transform="rotate(15 120 100)" />
            {/* Snout with small black nose */}
            <ellipse cx="100" cy="112" rx="10" ry="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            <circle cx="100" cy="110" r="3.5" fill="#0F172A" />
          </>
        );
      case 'dog':
      case 'bear':
      default:
        return (
          <>
            {/* Simple cute snout */}
            <ellipse cx="100" cy="112" rx="11" ry="8" fill={snoutColor} stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 96 109 C 96 106, 104 106, 104 109 C 104 112, 96 112, 96 109 Z" fill="#1E293B" />
          </>
        );
    }
  };

  const renderTail = () => {
    switch (animal) {
      case 'cat':
        return (
          <path d="M 130 145 C 150 145, 165 125, 160 100 C 158 90, 165 85, 172 90 C 178 95, 170 112, 170 115 C 165 135, 145 158, 125 152 Z" fill={tailColor} stroke="#1E293B" strokeWidth="3" strokeLinejoin="round" />
        );
      case 'rabbit':
        return (
          // Round fluffy tail
          <circle cx="140" cy="148" r="14" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
        );
      case 'fox':
        return (
          // Big bushy fox tail with white tip
          <g>
            <path d="M 132 145 C 170 155, 195 120, 185 95 C 170 98, 150 115, 132 135 Z" fill="#EA580C" stroke="#1E293B" strokeWidth="3" />
            <path d="M 185 95 C 180 100, 175 102, 170 100 C 172 108, 176 112, 185 110 Z" fill="#FFFFFF" />
          </g>
        );
      case 'dog':
      case 'bear':
      case 'panda':
      default:
        return (
          // Standard happy wagging tail path
          <path d="M 134 144 C 148 144, 158 134, 154 118 C 152 112, 158 108, 162 114 C 166 122, 158 154, 130 152 Z" fill={tailColor} stroke="#1E293B" strokeWidth="3" strokeLinejoin="round" />
        );
    }
  };

  return (
    <div className={`w-full h-full flex items-center justify-center state-${state}`}>
      <svg 
        id="pet-svg-viewport"
        viewBox="0 0 200 200" 
        className="w-full h-full max-w-[280px] max-h-[280px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{styleContent}</style>

        {/* DEFINITIONS & GRADIENTS */}
        <defs>
          <radialGradient id="shadow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. ROOM OVERLAYS & FLOOR SHADOW */}
        <ellipse cx="100" cy="172" rx="55" ry="10" fill="url(#shadow-grad)" />

        {/* 2. BACKWEAR ACCESSORY - WINGS */}
        {equippedAccessories.includes('wings') && (
          <g className="wing-group z-0">
            {/* Left Wing */}
            <path className="wing-l" d="M 65 120 C 30 105, 30 145, 55 140 C 40 148, 45 160, 60 148 C 55 158, 65 165, 70 145 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
            {/* Right Wing */}
            <path className="wing-r" d="M 135 120 C 170 105, 170 145, 145 140 C 160 148, 155 160, 140 148 C 145 158, 135 165, 130 145 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
          </g>
        )}

        {/* 3. MAIN ANIMAL BODY COMPONENT GROUP */}
        <g className="body-group">
          
          {/* A. Tail Layer */}
          <g className="tail-group">
            {renderTail()}
          </g>

          {/* B. Feet (Paws) */}
          <g className="feet-group">
            {/* Left foot */}
            <ellipse cx="78" cy="162" rx="11" ry="8" fill={primaryColor === '#FFFFFF' ? '#E2E8F0' : primaryColor} stroke="#1E293B" strokeWidth="2.5" />
            <circle cx="73" cy="158" r="2.5" fill="#1E293B" />
            <circle cx="78" cy="156" r="2.5" fill="#1E293B" />
            <circle cx="83" cy="158" r="2.5" fill="#1E293B" />
            {/* Right foot */}
            <ellipse cx="122" cy="162" rx="11" ry="8" fill={primaryColor === '#FFFFFF' ? '#E2E8F0' : primaryColor} stroke="#1E293B" strokeWidth="2.5" />
            <circle cx="117" cy="158" r="2.5" fill="#1E293B" />
            <circle cx="122" cy="156" r="2.5" fill="#1E293B" />
            <circle cx="127" cy="158" r="2.5" fill="#1E293B" />
          </g>

          {/* C. Torso Body */}
          <path 
            d="M 68 120 Q 50 145, 65 160 Q 100 166, 135 160 Q 150 145, 132 120 Z" 
            fill={primaryColor} 
            stroke="#1E293B" 
            strokeWidth="3" 
            strokeLinejoin="round" 
          />
          {/* White fluffy belly / chest for some depth */}
          <ellipse cx="100" cy="144" rx="22" ry="15" fill={chestColor} opacity="0.9" />

          {/* D. Head Base */}
          <g className="head-group">
            {/* Ears */}
            {renderEars()}

            {/* Face/Head circle */}
            <ellipse cx="100" cy="104" rx="46" ry="38" fill={primaryColor} stroke="#1E293B" strokeWidth="3" />
            
            {/* Rosy cheeks */}
            <circle cx="68" cy="114" r="5" fill={cheeksColor} opacity="0.6" />
            <circle cx="132" cy="114" r="5" fill={cheeksColor} opacity="0.6" />

            {/* Face accents */}
            {renderFaceAccents()}

            {/* EYES LAYER */}
            <g className="eyes-layer">
              {state === 'sleep' ? (
                <>
                  {/* Closed happy arch eyes */}
                  <path d="M 72 102 Q 80 108, 88 102" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 112 102 Q 120 108, 128 102" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
                </>
              ) : state === 'hibernate' ? (
                <>
                  {/* Straight closed hibernation eyes */}
                  <line x1="72" y1="102" x2="88" y2="102" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
                  <line x1="112" y1="102" x2="128" y2="102" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
                </>
              ) : state === 'play' || state === 'eat' ? (
                <>
                  {/* Super happy curved closed-arch eyes */}
                  <path d="M 72 104 Q 80 94, 88 104" fill="none" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 112 104 Q 120 94, 128 104" fill="none" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  {/* Standard eyes with blink keyframe */}
                  <g className="left-eye">
                    <circle cx="80" cy="100" r="7" fill={animal === 'panda' ? '#FFFFFF' : '#1E293B'} />
                    <circle cx="78" cy="98" r="2.5" fill="#FFFFFF" />
                  </g>
                  <g className="right-eye">
                    <circle cx="120" cy="100" r="7" fill={animal === 'panda' ? '#FFFFFF' : '#1E293B'} />
                    <circle cx="118" cy="98" r="2.5" fill="#FFFFFF" />
                  </g>
                </>
              )}
            </g>

            {/* MOUTH LAYER */}
            <g className="mouth-layer">
              {state === 'eat' || state === 'speak' ? (
                // Open animating mouth
                <ellipse className="mouth" cx="100" cy="114" rx="5" ry="4" fill="#E11D48" stroke="#1E293B" strokeWidth="1.5" />
              ) : state === 'hibernate' ? (
                // Neutral straight mouth during hibernation
                <line x1="97" y1="114" x2="103" y2="114" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
              ) : (
                // Simple happy smile curve
                <path d="M 96 113 Q 100 117, 104 113" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
              )}
            </g>

            {/* FACIAL ACCESSORIES - GLASSES */}
            {equippedAccessories.includes('glasses') && (
              <g className="glasses-accessory">
                {/* Left rim */}
                <circle cx="80" cy="100" r="12" fill="none" stroke="#000000" strokeWidth="3" />
                {/* Right rim */}
                <circle cx="120" cy="100" r="12" fill="none" stroke="#000000" strokeWidth="3" />
                {/* Bridge */}
                <line x1="92" y1="100" x2="108" y2="100" stroke="#000000" strokeWidth="3" />
              </g>
            )}

            {/* HEADWEAR ACCESSORIES - HAT OR RIBBON */}
            {equippedAccessories.includes('hat') && (
              <g className="hat-accessory" transform="translate(100, 68)">
                <ellipse cx="0" cy="0" rx="22" ry="5" fill="#1E293B" stroke="#000000" strokeWidth="1.5" />
                <rect x="-14" y="-22" width="28" height="22" fill="#1E293B" stroke="#000000" strokeWidth="1.5" />
                <rect x="-14" y="-7" width="28" height="4" fill="#EF4444" />
              </g>
            )}

            {equippedAccessories.includes('ribbon') && (
              <g className="ribbon-accessory" transform="translate(130, 75)">
                <circle cx="0" cy="0" r="6" fill="#EF4444" />
                <path d="M 0 0 L 12 -8 L 12 8 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
                <path d="M 0 0 L -12 -8 L -12 8 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
              </g>
            )}

          </g>

          {/* NECK ACCESSORIES - COLLAR OR SCARF */}
          {equippedAccessories.includes('collar') && (
            <g className="collar-accessory">
              {/* Strap */}
              <path d="M 72 121 Q 100 128, 128 121" fill="none" stroke="#D97706" strokeWidth="4.5" strokeLinecap="round" />
              {/* Golden bell */}
              <circle cx="100" cy="126" r="5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
              <circle cx="100" cy="125" r="1.5" fill="#FFFFFF" />
            </g>
          )}

          {equippedAccessories.includes('scarf') && (
            <g className="scarf-accessory">
              {/* Cozy red scarf */}
              <path d="M 70 120 Q 100 130, 130 120" fill="none" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />
              {/* Tail of the scarf hanging */}
              <path d="M 118 124 L 124 144" fill="none" stroke="#B91C1C" strokeWidth="6" strokeLinecap="round" />
              <path d="M 124 123 L 132 140" fill="none" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
            </g>
          )}

        </g>

        {/* 4. SYNCED EFFECT OVERLAYS */}
        {activeEffects.includes('hearts') && (
          <g className="hearts-particles" pointerEvents="none">
            <g style={{ animation: 'pet-heart-float 2.5s infinite', transformOrigin: '80px 80px' }}>
              <text x="75" y="75" fill="#EF4444" fontSize="14">❤️</text>
            </g>
            <g style={{ animation: 'pet-heart-float 3s infinite 0.8s', transformOrigin: '120px 70px' }}>
              <text x="115" y="65" fill="#EF4444" fontSize="11">❤️</text>
            </g>
            <g style={{ animation: 'pet-heart-float 2.2s infinite 1.5s', transformOrigin: '100px 90px' }}>
              <text x="95" y="85" fill="#F43F5E" fontSize="12">💕</text>
            </g>
          </g>
        )}

        {activeEffects.includes('stars') && (
          <g className="stars-particles" pointerEvents="none">
            <g style={{ animation: 'pet-stars-spin 6s linear infinite', transformOrigin: '100px 100px' }}>
              <text x="50" y="60" fill="#F59E0B" fontSize="12">✨</text>
              <text x="140" y="70" fill="#FBBF24" fontSize="14">✨</text>
              <text x="70" y="140" fill="#FBBF24" fontSize="10">⭐</text>
              <text x="130" y="130" fill="#F59E0B" fontSize="11">⭐</text>
            </g>
          </g>
        )}

        {activeEffects.includes('snow') && (
          <g className="snow-particles" pointerEvents="none">
            <g style={{ animation: 'pet-heart-float 4s infinite', transformOrigin: '70px 60px' }}>
              <text x="65" y="55" fill="#E2E8F0" fontSize="11">❄️</text>
            </g>
            <g style={{ animation: 'pet-heart-float 3.5s infinite 1s', transformOrigin: '130px 60px' }}>
              <text x="125" y="55" fill="#E2E8F0" fontSize="13">❄️</text>
            </g>
            <g style={{ animation: 'pet-heart-float 4.5s infinite 2s', transformOrigin: '100px 70px' }}>
              <text x="95" y="65" fill="#CBD5E1" fontSize="12">❄️</text>
            </g>
          </g>
        )}

        {activeEffects.includes('bubbles') && (
          <g className="bubbles-particles" pointerEvents="none">
            <g style={{ animation: 'pet-heart-float 3.2s infinite', transformOrigin: '60px 80px' }}>
              <text x="55" y="75" fill="#38BDF8" fontSize="12">🫧</text>
            </g>
            <g style={{ animation: 'pet-heart-float 2.8s infinite 0.7s', transformOrigin: '140px 80px' }}>
              <text x="135" y="75" fill="#0EA5E9" fontSize="14">🫧</text>
            </g>
            <g style={{ animation: 'pet-heart-float 3s infinite 1.4s', transformOrigin: '100px 90px' }}>
              <text x="95" y="85" fill="#7DD3FC" fontSize="11">🫧</text>
            </g>
          </g>
        )}

        {activeEffects.includes('flowers') && (
          <g className="flowers-particles" pointerEvents="none">
            <g style={{ animation: 'pet-heart-float 3.5s infinite', transformOrigin: '75px 75px' }}>
              <text x="70" y="70" fill="#F472B6" fontSize="11">🌸</text>
            </g>
            <g style={{ animation: 'pet-heart-float 3.8s infinite 1.2s', transformOrigin: '125px 75px' }}>
              <text x="120" y="70" fill="#F472B6" fontSize="12">🌸</text>
            </g>
          </g>
        )}

        {activeEffects.includes('leaves') && (
          <g className="leaves-particles" pointerEvents="none">
            <g style={{ animation: 'pet-heart-float 3s infinite', transformOrigin: '80px 80px' }}>
              <text x="75" y="75" fill="#10B981" fontSize="11">🍃</text>
            </g>
            <g style={{ animation: 'pet-heart-float 3.4s infinite 1.5s', transformOrigin: '120px 80px' }}>
              <text x="115" y="75" fill="#059669" fontSize="12">🍃</text>
            </g>
          </g>
        )}

      </svg>
    </div>
  );
};
