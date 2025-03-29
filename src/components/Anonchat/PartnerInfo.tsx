// components/PartnerInfo.tsx
import React from 'react';
import { Gender } from '@/types';

interface PartnerInfoProps {
  partnerGender: Gender | null;
}

const PartnerInfo: React.FC<PartnerInfoProps> = ({ partnerGender }) => {
  const getGenderIcon = (gender: Gender | null) => {
    switch (gender) {
      case 'male':
        return '♂️';
      case 'female':
        return '♀️';
      case 'other':
        return '⚧️';
      default:
        return '👤';
    }
  };
  
  return (
    <div className="flex items-center">
      <div className="bg-green-500 h-3 w-3 rounded-full mr-2"></div>
      <div className="font-medium">
        Chatting with {getGenderIcon(partnerGender)} {partnerGender ? partnerGender.charAt(0).toUpperCase() + partnerGender.slice(1) : 'Unknown'} Stranger
      </div>
    </div>
  );
};

export default PartnerInfo;