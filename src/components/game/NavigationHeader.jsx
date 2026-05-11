import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const TITLES = {
  '/': 'PureDrop',
  '/customize': 'Customize Cup',
  '/play': 'Playing',
  '/gameover': 'Results',
};

export default function NavigationHeader({ onBack }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = location.pathname === '/';
  const title = TITLES[location.pathname] || 'PureDrop';

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    navigate(-1);
  };

  return (
    <div className="w-full flex items-center px-4 pt-3 pb-1 max-w-sm mx-auto">
      {!isRoot ? (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-3"
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
      ) : (
        <div style={{ minWidth: 44, minHeight: 44 }} />
      )}
      <span className="font-pixel text-primary text-xs flex-1 text-center">
        {isRoot ? title : ''}
      </span>
      {/* Spacer to balance back button */}
      <div style={{ minWidth: 44 }} />
    </div>
  );
}