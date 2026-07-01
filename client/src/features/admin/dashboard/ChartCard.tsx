import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Minimum body height so cards in the same row align nicely. */
  minHeight?: number;
}

/** Shared surface for dashboard widgets: titled, bordered, rounded panel. */
export default function ChartCard({ title, subtitle, action, children, minHeight }: ChartCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        height: '100%',
        borderRadius: 3,
        border: '1px solid #eceef2',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a1c1e' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Box sx={{ flex: 1, minHeight }}>{children}</Box>
    </Paper>
  );
}
