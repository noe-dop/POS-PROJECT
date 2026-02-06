// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Vérifier si window existe (pour SSR)
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    
    // Définir la valeur initiale
    setMatches(mediaQuery.matches);
    
    // Fonction de mise à jour
    const updateMatches = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Ajouter l'écouteur (compatible avec les anciens navigateurs)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatches);
    } else {
      // Fallback pour les anciens navigateurs
      mediaQuery.addListener(updateMatches);
    }
    
    // Nettoyer l'écouteur
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMatches);
      } else {
        // Fallback pour les anciens navigateurs
        mediaQuery.removeListener(updateMatches);
      }
    };
  }, [query]);

  return matches;
}

export function useBreakpoints() {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)');
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isSmallScreen: isMobile || isTablet,
    isMediumScreen: isTablet && !isMobile,
    isLargeScreen: isDesktop
  };
}

// Hook utilitaire pour les tailles d'écran courantes
export function useScreenSize() {
  const breakpoints = useBreakpoints();
  
  const screenSize = useMemo(() => {
    if (breakpoints.isMobile) return 'mobile';
    if (breakpoints.isTablet) return 'tablet';
    if (breakpoints.isDesktop) return 'desktop';
    return 'large-desktop';
  }, [breakpoints]);
  
  return {
    ...breakpoints,
    screenSize
  };
}