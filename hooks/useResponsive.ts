import { useContext } from 'react';
import { useMediaQuery } from 'react-responsive';
import { ThemeContext } from 'styled-components';

export const useResponsive = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' => {
  const theme = useContext(ThemeContext);

  const isXl = useMediaQuery({ minWidth: theme.breakpoints.xl });

  const isLg = useMediaQuery({
    minWidth: theme.breakpoints.lg,
    maxWidth: theme.breakpoints.xl - 1,
  });

  const isMd = useMediaQuery({
    minWidth: theme.breakpoints.md,
    maxWidth: theme.breakpoints.lg - 1,
  });

  const isSm = useMediaQuery({
    minWidth: theme.breakpoints.sm,
    maxWidth: theme.breakpoints.md - 1,
  });

  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';

  return 'xs';
};
