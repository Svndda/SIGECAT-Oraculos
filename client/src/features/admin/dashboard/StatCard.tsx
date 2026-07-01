import type { ReactNode } from 'react';
import { Box, Paper, Skeleton, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  /** Accent color used for the icon chip; defaults to the brand blue. */
  color?: string;
  /** Optional secondary line shown under the value. */
  caption?: ReactNode;
  loading?: boolean;
  /** When provided, the card becomes an interactive button. */
  onClick?: () => void;
}

export default function StatCard({
  label,
  value,
  icon,
  color = '#12457d',
  caption,
  loading = false,
  onClick,
}: StatCardProps) {
  const interactive = !!onClick;
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      sx={{
        p: 2.5,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 3,
        border: '1px solid #eceef2',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': interactive
          ? { boxShadow: '0 6px 20px rgba(18, 69, 125, 0.12)', transform: 'translateY(-2px)', borderColor: `${color}55` }
          : { boxShadow: '0 6px 20px rgba(18, 69, 125, 0.08)', transform: 'translateY(-2px)' },
        '&:focus-visible': interactive ? { outline: `2px solid ${color}`, outlineOffset: 2 } : undefined,
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '14px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          backgroundColor: `${color}14`,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={72} height={38} />
        ) : (
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1, color: '#1a1c1e' }}>
            {value}
          </Typography>
        )}
        {caption && !loading && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {caption}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
