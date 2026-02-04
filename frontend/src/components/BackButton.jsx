import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Universal Back Button Component
 * Used on all secondary pages for consistent navigation
 */
export const BackButton = ({ 
  to = null, 
  label = "Retour",
  className = "" 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`flex items-center gap-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 mb-4 ${className}`}
      data-testid="back-button"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </Button>
  );
};

export default BackButton;
