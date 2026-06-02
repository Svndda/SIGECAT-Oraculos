import type { ReactNode } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material';

/**
 * A column/field definition shared by the desktop table and the mobile card.
 * `render` may return a plain string/number (wrapped automatically) or a node.
 */
export interface DataColumn<T> {
  label: string;
  /** Desktop flex sizing, e.g. '0 0 25%' or '1'. */
  flex: string;
  render: (item: T) => ReactNode;
  /** Card title on mobile; shown as the bold primary text on desktop. */
  primary?: boolean;
  /** Rendered top-right of the card header on mobile (e.g. a status chip). */
  badge?: boolean;
  /** Rendered as small plain text at the foot of the card (e.g. a date). */
  meta?: boolean;
  /** Truncate with an ellipsis on desktop instead of wrapping. */
  truncate?: boolean;
}

export interface RowAction<T> {
  icon: ReactNode;
  label: string;
  onClick: (item: T) => void;
  /** Icon/text colour. Defaults to the neutral grey used across the admin UI. */
  color?: string;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  items: T[];
  getKey: (item: T) => string;
  actions?: RowAction<T>[];
  emptyMessage: string;
  loading?: boolean;
  /** Desktop min-width before the table scrolls horizontally. */
  minWidth?: number;
}

const isText = (v: ReactNode): v is string | number =>
  typeof v === 'string' || typeof v === 'number';

export default function DataTable<T>({
  columns,
  items,
  getKey,
  actions,
  emptyMessage,
  loading = false,
  minWidth = 720,
}: DataTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const empty = (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
      {emptyMessage}
    </Typography>
  );

  // ----- Mobile: stacked cards -----
  if (isMobile) {
    if (loading) {
      return (
        <Stack spacing={1.5}>
          {Array.from(new Array(4)).map((_, i) => (
            <Paper key={i} elevation={0} sx={{ p: 2, border: '1px solid #ebebeb', borderRadius: 2 }}>
              <Skeleton animation="wave" height={28} width="55%" />
              <Skeleton animation="wave" height={48} />
              <Skeleton animation="wave" height={48} />
            </Paper>
          ))}
        </Stack>
      );
    }
    if (items.length === 0) return empty;

    const primary = columns.find((c) => c.primary);
    const badge = columns.find((c) => c.badge);
    const fields = columns.filter((c) => !c.primary && !c.badge && !c.meta);
    const metas = columns.filter((c) => c.meta);

    return (
      <Stack spacing={2}>
        {items.map((item) => (
          <Paper
            key={getKey(item)}
            elevation={0}
            sx={{ p: 2, border: '1px solid #ebebeb', borderRadius: 2.5 }}
          >
            {/* Header: title + badge */}
            {(primary || badge) && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                {primary && (
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ color: '#1a1a1a', flex: 1, wordBreak: 'break-word' }}
                  >
                    {primary.render(item)}
                  </Typography>
                )}
                {badge && <Box sx={{ flexShrink: 0 }}>{badge.render(item)}</Box>}
              </Box>
            )}

            {/* Fields as labelled grey boxes */}
            <Stack spacing={1}>
              {fields.map((col) => {
                const value = col.render(item);
                return (
                  <Box
                    key={col.label}
                    sx={{ backgroundColor: '#f6f6f7', borderRadius: 1.5, px: 1.5, py: 1 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: '#8a8a8a', display: 'block', lineHeight: 1.4 }}
                    >
                      {col.label}
                    </Typography>
                    {isText(value) ? (
                      <Typography variant="body2" sx={{ color: '#333', wordBreak: 'break-word' }}>
                        {value || '—'}
                      </Typography>
                    ) : (
                      <Box sx={{ mt: 0.25 }}>{value}</Box>
                    )}
                  </Box>
                );
              })}
            </Stack>

            {/* Meta line (e.g. date) */}
            {metas.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5, px: 0.5 }}>
                {metas.map((col) => (
                  <Typography key={col.label} variant="caption" sx={{ color: '#999' }}>
                    {col.label}: {col.render(item)}
                  </Typography>
                ))}
              </Box>
            )}

            {/* Actions */}
            {actions && actions.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outlined"
                    size="small"
                    startIcon={action.icon}
                    onClick={() => action.onClick(item)}
                    sx={{
                      flex: '1 1 40%',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#dcdcdc',
                      color: action.color ?? '#444',
                      '&:hover': { borderColor: '#bbb', backgroundColor: '#fafafa' },
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            )}
          </Paper>
        ))}
      </Stack>
    );
  }

  // ----- Desktop: horizontal table -----
  const actionsWidth = actions && actions.length > 0 ? Math.max(72, actions.length * 44) : 0;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.25, mb: 1 }}>
          {columns.map((col) => (
            <Typography
              key={col.label}
              variant="caption"
              fontWeight={700}
              sx={{ flex: col.flex, color: '#555', fontSize: '0.8rem' }}
            >
              {col.label}
            </Typography>
          ))}
          {actionsWidth > 0 && <Box sx={{ width: actionsWidth }} />}
        </Box>

        {/* Rows */}
        <Stack spacing={1.5}>
          {loading ? (
            Array.from(new Array(5)).map((_, i) => (
              <Paper key={i} elevation={0} sx={{ p: 2, border: '1px solid #ebebeb', borderRadius: 2 }}>
                <Skeleton animation="wave" height={24} width="100%" />
              </Paper>
            ))
          ) : items.length > 0 ? (
            items.map((item) => (
              <Paper
                key={getKey(item)}
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2.5,
                  py: 1.75,
                  border: '1px solid #ebebeb',
                  borderRadius: 2,
                }}
              >
                {columns.map((col) => {
                  const value = col.render(item);
                  return (
                    <Box key={col.label} sx={{ flex: col.flex, minWidth: 0, pr: 2 }}>
                      {isText(value) ? (
                        <Typography
                          variant="body2"
                          noWrap={col.truncate}
                          fontWeight={col.primary ? 600 : 400}
                          sx={{
                            color: col.primary ? '#333' : '#555',
                            ...(col.truncate
                              ? { overflow: 'hidden', textOverflow: 'ellipsis' }
                              : {}),
                          }}
                        >
                          {value || '—'}
                        </Typography>
                      ) : (
                        value
                      )}
                    </Box>
                  );
                })}
                {actionsWidth > 0 && (
                  <Box
                    sx={{
                      width: actionsWidth,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                    }}
                  >
                    {actions!.map((action) => (
                      <Tooltip key={action.label} title={action.label}>
                        <IconButton
                          size="small"
                          onClick={() => action.onClick(item)}
                          sx={{ color: action.color ?? '#666' }}
                        >
                          {action.icon}
                        </IconButton>
                      </Tooltip>
                    ))}
                  </Box>
                )}
              </Paper>
            ))
          ) : (
            empty
          )}
        </Stack>
      </Box>
    </Box>
  );
}
