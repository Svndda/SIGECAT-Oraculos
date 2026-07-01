import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Tooltip,
  Typography,
} from '@mui/material';

import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { JobPosition } from '../../../services/jobPositionService';

interface JobPositionListProps {
  jobPositions: JobPosition[];
  loading: boolean;
  onEdit: (jobPosition: JobPosition) => void;
  onDelete: (jobPosition: JobPosition) => void;
  onView: (jobPosition: JobPosition) => void;
  parentLabel: (jobPosition: JobPosition) => string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function JobPositionList({
  jobPositions,
  loading,
  onEdit,
  onDelete,
  onView,
  parentLabel,
}: JobPositionListProps) {
  const columns: DataColumn<JobPosition>[] = [
    {
      label: 'Número',
      flex: '0 0 18%',
      primary: true,
      truncate: true,
      render: (p) => (
        <Tooltip title={p.job_position_number} arrow>
          <Typography variant="body2" noWrap>
            {p.job_position_number}
          </Typography>
        </Tooltip>
      )
    },
    {
      label: 'Entidad',
      flex: '1',
      truncate: true,
      render: (p) => parentLabel(p)
    },
    {
      label: 'Fecha de creación',
      flex: '0 0 18%',
      meta: true,
      render: (p) => formatDate(p.created_at)
    }
  ];

  return (
    <DataTable
      columns={columns}
      items={jobPositions}
      getKey={(p) => p.job_position_id}
      loading={loading}
      actions={[
        {
          icon: <VisibilityIcon fontSize="small" />,
          label: 'Ver',
          onClick: onView,
          color: 'info.main'
        },
        {
          icon: <EditIcon fontSize="small" />,
          label: 'Editar',
          color: '#1a2b4a',
          onClick: onEdit
        },
        {
          icon: <DeleteOutlineIcon fontSize="small" />,
          label: 'Eliminar',
          color: '#9e9e9e',
          onClick: onDelete
        }
      ]}
      emptyMessage="No se encontraron plazas."
    />
  );
}