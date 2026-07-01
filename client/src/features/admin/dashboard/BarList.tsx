import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export interface BarItem {
  label: string;
  value: number;
  color: string;
  icon?: ReactNode;
}

interface BarListProps {
  items: BarItem[];
}

/** Horizontal progress-style bars, each scaled against the largest value. */
export default function BarList({ items }: BarListProps) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item) => (
        <Box key={item.label}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {item.icon && (
              <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
            )}
            <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
              {item.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1c1e' }}>
              {item.value}
            </Typography>
          </Box>
          <Box sx={{ height: 8, borderRadius: 4, backgroundColor: '#eef0f4', overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${(item.value / max) * 100}%`,
                minWidth: item.value > 0 ? 6 : 0,
                borderRadius: 4,
                backgroundColor: item.color,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
