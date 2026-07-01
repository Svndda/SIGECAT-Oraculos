import { Box, Chip, Divider, Typography } from '@mui/material';
import { formatOracleDate } from '../../../services/common';
import type { LogLevel, SystemLog } from '../../../services/logService';

const LEVEL_COLORS: Record<LogLevel, 'default' | 'info' | 'warning' | 'error'> = {
  DEBUG: 'default',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'error',
};

interface ActivityFeedProps {
  logs: SystemLog[];
}

/** Compact, read-only rendering of the most recent system log entries. */
export default function ActivityFeed({ logs }: ActivityFeedProps) {
  if (logs.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No hay actividad reciente.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {logs.map((log, i) => (
        <Box key={log.id}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.25 }}>
            <Chip
              size="small"
              label={log.level}
              color={LEVEL_COLORS[log.level]}
              variant={log.level === 'DEBUG' ? 'outlined' : 'filled'}
              sx={{ flexShrink: 0, minWidth: 72 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.primary' }} title={log.message}>
                {log.message}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {log.category}
                {log.action ? ` · ${log.action}` : ''} · {formatOracleDate(log.created_at, true)}
              </Typography>
            </Box>
          </Box>
          {i < logs.length - 1 && <Divider />}
        </Box>
      ))}
    </Box>
  );
}
