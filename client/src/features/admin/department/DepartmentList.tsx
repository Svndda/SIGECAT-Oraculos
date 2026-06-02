import { Box, Paper, Stack, Typography, IconButton, Tooltip, Skeleton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Department } from '../../../services/DepartmentService';

interface DepartmentListProps {
  departments: Department[];
  loading: boolean;
  areaMap: Map<string, string>;
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
}

const COLS = [
  { label: 'Nombre', flex: '0 0 25%' },
  { label: 'Descripción', flex: '1' },
  { label: 'Área', flex: '0 0 20%' },
  { label: 'Fecha de creación', flex: '0 0 15%' },
  { label: 'Acciones', flex: '0 0 10%' },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function DepartmentList(
  { departments, loading, areaMap, onEdit, onDelete }: DepartmentListProps
) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 800 }}>
        <Box sx={{ display: 'flex', px: 2.5, py: 1.25, mb: 1 }}>
          {COLS.map((col) => (
            <Typography
              key={col.label}
              variant="caption"
              fontWeight={700}
              sx={{ flex: col.flex, color: '#555', fontSize: '0.8rem' }}>
              {col.label}
            </Typography>
          ))}
        </Box>

        <Stack spacing={1.5}>
          {loading ? (
            Array.from(new Array(5)).map((_, i) => (
              <Paper
                key={i}
                elevation={0}
                sx={{ p: 2, border: '1px solid #ebebeb', borderRadius: 2 }}>
                <Skeleton animation="wave" height={24} width="100%" />
              </Paper>
            ))
          ) : departments.length > 0 ? (
            departments.map((dept) => (
              <Paper
                key={dept.department_id}
                elevation={0}
                sx={{
                    display: 'flex', alignItems: 'center', px: 2.5,
                    py: 1.75, border: '1px solid #ebebeb', borderRadius: 2
                }}>
                <Typography
                  variant="body2"
                  sx={{ flex: COLS[0].flex, color: '#333' }}>
                  {dept.name}
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ flex: COLS[1].flex, color: '#555', pr: 2 }}>
                  {dept.description ?? '—'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ flex: COLS[2].flex, color: '#333' }}>
                  {areaMap.get(dept.area_id) ?? 'Cargando Área...'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ flex: COLS[3].flex, color: '#555' }}>
                  {formatDate(dept.created_at)}
                </Typography>
                <Box
                  sx={{ flex: COLS[4].flex, display: 'flex', gap: 1 }}>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(dept)}
                      sx={{ color: '#666' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(dept.department_id)}
                      sx={{ color: '#666' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            ))
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', py: 6 }}>
              No se encontraron departamentos.
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}