import { Avatar, Box, Button, Chip, Divider, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatOracleDate } from '../../../services/common';
import type { Declaration } from '../../../services/declarationsService';

interface PendingReviewPanelProps {
  pending: Declaration[];
  /** Total number of declarations in review (may exceed the shown list). */
  total: number;
  /** Opens the review flow for a specific declaration. */
  onReview: (declaration: Declaration) => void;
  /** Navigates to the full, pre-filtered review queue. */
  onSeeAll: () => void;
}

function fullName(dec: Declaration): string {
  const u = dec.user;
  if (!u) return 'Funcionario';
  return [u.first_name, u.second_name, u.first_last_name, u.second_last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Funcionario';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/**
 * Actionable queue of declarations awaiting admin review. Turns the dashboard
 * from read-only into a starting point for resolving pending work.
 */
export default function PendingReviewPanel({ pending, total, onReview, onSeeAll }: PendingReviewPanelProps) {
  if (pending.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 44, color: '#2e7d32' }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1c1e' }}>
          Todo al día
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          No hay declaraciones en revisión.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {pending.map((dec, i) => {
        const name = fullName(dec);
        return (
          <Box key={dec.declaration_id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#5376f3', fontSize: 14, flexShrink: 0 }}>
                {initials(name)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1c1e' }} noWrap title={name}>
                  {name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                  {dec.job?.name ?? 'Sin cargo'} · {formatOracleDate(dec.created_at)}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onReview(dec)}
                sx={{ flexShrink: 0, textTransform: 'none', borderColor: '#5376f3', color: '#5376f3' }}
              >
                Revisar
              </Button>
            </Box>
            {i < pending.length - 1 && <Divider />}
          </Box>
        );
      })}

      {total > pending.length && (
        <Box sx={{ pt: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={onSeeAll}
            sx={{ textTransform: 'none', color: '#12457d' }}
          >
            Ver las {total} en revisión
          </Button>
        </Box>
      )}

      {total <= pending.length && (
        <Box sx={{ pt: 1 }}>
          <Chip
            size="small"
            label={`${total} en revisión`}
            sx={{ bgcolor: '#5376f314', color: '#5376f3', fontWeight: 600 }}
          />
        </Box>
      )}
    </Box>
  );
}
