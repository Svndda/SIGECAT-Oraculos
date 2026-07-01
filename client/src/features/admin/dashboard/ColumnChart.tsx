import { Box, Tooltip, Typography } from '@mui/material';

export interface ColumnPoint {
  key: string;
  label: string;
  count: number;
}

interface ColumnChartProps {
  data: ColumnPoint[];
  color?: string;
  height?: number;
}

/** Simple vertical bar chart for a small time series, built with flex boxes. */
export default function ColumnChart({ data, color = '#12457d', height = 200 }: ColumnChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height, px: 1 }}>
      {data.map((point) => {
        const ratio = point.count / max;
        return (
          <Box
            key={point.key}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#1a1c1e' }}>
              {point.count}
            </Typography>
            <Tooltip title={`${point.label}: ${point.count}`} arrow>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 40,
                  height: `${Math.max(ratio * 100, point.count > 0 ? 4 : 2)}%`,
                  minHeight: 4,
                  borderRadius: '6px 6px 2px 2px',
                  background: point.count > 0
                    ? `linear-gradient(180deg, ${color} 0%, ${color}bb 100%)`
                    : '#eef0f4',
                  transition: 'height 0.3s ease',
                }}
              />
            </Tooltip>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
              {point.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
