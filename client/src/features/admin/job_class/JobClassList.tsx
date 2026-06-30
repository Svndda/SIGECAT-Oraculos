import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Tooltip, Typography } from '@mui/material';
import type { JobClass } from '../../../services/jobClassService';
import DataTable, { type DataColumn } from '../../../components/DataTable';

interface JobClassListProps {
  jobClasses: JobClass[];
  loading: boolean;
  onEdit: (jobClass: JobClass) => void;
  onDelete: (jobClass: JobClass) => void;
  onView: (jobClass: JobClass) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function JobClassList({
  jobClasses,
  loading,
  onEdit,
  onDelete,
  onView
}: JobClassListProps) {
  const columns: DataColumn<JobClass>[] = [
    {
      label: 'Código',
      flex: '0 0 10%',
      render: (j) => j.job_class_code.toString()
    },
    {
      label: 'Nombre',
      flex: '1',
      primary: true,
      truncate: true,
      render: (j) => (
        <Tooltip title={j.name} arrow>
          <Typography variant="body2" noWrap>
            {j.name}
          </Typography>
        </Tooltip>
      )
    },
    {
      label: 'Fecha de creación',
      flex: '0 0 15%',
      meta: true,
      render: (j) => formatDate(j.created_at)
    }
  ];

  return (
    <DataTable
      columns={columns}
      items={jobClasses}
      getKey={(j) => j.job_class_id}
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
          onClick: onDelete,
          color: '#9e9e9e'
        }
      ]}
      emptyMessage="No se encontraron clases ocupacionales."
    />
  );
}