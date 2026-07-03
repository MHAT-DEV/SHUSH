import React from 'react';
import { useIdentity } from '../IdentityContext.tsx';

type UserDisplayProps = {
  user: {
    id?: string;
    displayName: string;
    username?: string;
  };
  showUsername?: boolean;
  className?: string;
};

export default function UserDisplay({
  user,
  showUsername = false,
  className = ''
}: UserDisplayProps) {
  const { activeBadge, activeNameColor, currentUserId } = useIdentity();
  
  // In a real app, we'd fetch the badge and color for each specific user.
  // For this demo, we apply the current active identity ONLY if it's the current user (mocked check via ID "user-1") 
  // OR we just apply it to everyone to show off the feature. Let's apply it if no ID or ID starts with 'user'.
  // Actually, let's just use the context for the current user (if we assume user.id === '1' or 'user-1' is the active user)
  // To keep it simple, we'll apply a mock assignment for friends, and the real one for the active user.
  
  const isSelf = user.id === currentUserId || !user.id;
  
  // Mock some colors and badges for friends based on their name length just to show off the system
  const mockNameColor = user.displayName.length % 3 === 0 ? '#fbbf24' : user.displayName.length % 5 === 0 ? '#22d3ee' : null;
  const mockBadge = user.displayName.length % 4 === 0 ? '✨' : user.displayName.length % 7 === 0 ? '🔥' : null;

  const displayColor = isSelf ? activeNameColor : mockNameColor;
  const displayBadge = isSelf ? activeBadge : mockBadge;

  let style: React.CSSProperties = {};
  let textClass = className;
  
  if (displayColor) {
    if (displayColor.startsWith('gradient-')) {
      textClass += ' text-transparent bg-clip-text';
      if (displayColor === 'gradient-fire') style.backgroundImage = 'linear-gradient(to right, #f97316, #ef4444)';
      else if (displayColor === 'gradient-ocean') style.backgroundImage = 'linear-gradient(to right, #06b6d4, #3b82f6)';
      else if (displayColor === 'gradient-royal') style.backgroundImage = 'linear-gradient(to right, #8b5cf6, #fbbf24)';
    } else {
      style.color = displayColor;
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${textClass}`} style={style}>
      <span className="truncate">{user.displayName}</span>
      {displayBadge && <span className="flex-shrink-0 text-sm">{displayBadge}</span>}
      {showUsername && user.username && (
        <span className="text-xs opacity-60 font-mono">@{user.username}</span>
      )}
    </span>
  );
}
