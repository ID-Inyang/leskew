// client/src/components/Avatar.jsx
import React from 'react';

const Avatar = ({ user, size = 'md', showName = false, className = '' }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs': return 'w-6 h-6 text-xs';
      case 'sm': return 'w-8 h-8 text-sm';
      case 'md': return 'w-10 h-10';
      case 'lg': return 'w-12 h-12 text-lg';
      case 'xl': return 'w-16 h-16 text-xl';
      case '2xl': return 'w-20 h-20 text-2xl';
      default: return 'w-10 h-10';
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = getSizeClasses();
  const avatarUrl = user?.avatar?.url;

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`relative rounded-full overflow-hidden ${sizeClasses} flex-shrink-0`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.querySelector('.avatar-fallback').style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`avatar-fallback w-full h-full bg-primary-600 text-white flex items-center justify-center font-semibold ${
            avatarUrl ? 'hidden' : 'flex'
          }`}
        >
          {user?.name ? getInitials(user.name) : '?'}
        </div>
      </div>
      {showName && user?.name && (
        <span className="ml-2 font-medium">{user.name}</span>
      )}
    </div>
  );
};

export default Avatar;