import { Box, Typography } from '@mui/material';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Big number rendered in the middle of the ring. */
  centerValue: number | string;
  /** Small label under the center value. */
  centerLabel: string;
  size?: number;
  thickness?: number;
}

/**
 * Dependency-free donut chart drawn with a single SVG. Segments are laid out by
 * advancing each arc's `stroke-dashoffset` around the circle's circumference.
 */
export default function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 180,
  thickness = 22,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
      <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} role="img" aria-label={`${centerValue} ${centerLabel}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#eef0f4"
            strokeWidth={thickness}
          />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const fraction = s.value / total;
                const dash = fraction * circumference;
                const circle = (
                  <circle
                    key={s.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    transform={`rotate(-90 ${center} ${center})`}
                  >
                    <title>{`${s.label}: ${s.value}`}</title>
                  </circle>
                );
                offset += dash;
                return circle;
              })}
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1, color: '#1a1c1e' }}>
            {centerValue}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {centerLabel}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 140 }}>
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: s.color, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
                {s.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1c1e' }}>
                {s.value}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', width: 34, textAlign: 'right' }}>
                {pct}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
