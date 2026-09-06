import React from 'react';

interface NoteNirmanLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
}

export const NoteNirmanLogo: React.FC<NoteNirmanLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  textClassName = '',
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16 md:w-20 md:h-20',
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <img
        src="/app-icon.png"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/pwa-icon.png';
        }}
        alt="NoteNirman Symbol"
        className={`${sizeMap[size]} rounded-lg object-contain drop-shadow-sm select-none`}
      />
      {showText && (
        <span className={`font-mono font-bold tracking-tight select-none ${textClassName}`}>
          NoteNirman
        </span>
      )}
    </div>
  );
};

export default NoteNirmanLogo;
