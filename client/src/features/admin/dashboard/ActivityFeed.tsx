import { Box, Chip, Divider, Typography } from '@mui/material';
import { formatOracleDate } from '../../../services/common';
import type { SystemLog } from '../../../services/logService';
import { activityMeta, SEVERITY_META } from '../../../services/activityLog';

interface ActivityFeedProps {
  logs: SystemLog[];
}

/** Compact, read-only rendering of the most recent business activity. */
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
      {logs.map((log, i) => {
        const meta = activityMeta(log);
        const sev = SEVERITY_META[meta.severity];
        return (
          <Box key={log.id}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.25 }}>
              <Chip
                size="small"
                label={sev.label}
                color={sev.color}
                sx={{ flexShrink: 0, minWidth: 64 }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.primary' }} title={log.message}>
                  {log.message}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {meta.actionLabel} · {meta.entityLabel} · {formatOracleDate(log.created_at, true)}
                </Typography>
              </Box>
            </Box>
            {i < logs.length - 1 && <Divider />}
          </Box>
        );
      })}
    </Box>
  );
}
