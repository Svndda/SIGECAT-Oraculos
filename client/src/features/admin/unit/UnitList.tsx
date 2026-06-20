import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Tooltip, Typography } from '@mui/material';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { Unit } from '../../../services/unitService';
import { truncateText } from '../../../utils/text';

interface UnitListProps {
  units: Unit[];
  loading: boolean;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  onView: (unit: Unit) => void;
  belongsTo: (unit: Unit) => string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function UnitList({ units, loading, onEdit, onDelete, onView, belongsTo }: UnitListProps) {
  const columns: DataColumn<Unit>[] = [
    {
      label: 'Nombre',
      flex: '0 0 26%',
      primary: true,
      truncate: true,
      render: (u) => (
        <Tooltip title={u.name} arrow>
          <Typography variant="body2" fontWeight={600} noWrap>
            {truncateText(u.name)}
          </Typography>
        </Tooltip>
      ),
    },
    { label: 'Descripción', flex: '1', truncate: true, render: (u) => u.description ?? '—' },
    { label: 'Pertenece a', flex: '0 0 22%', truncate: true, render: (u) => belongsTo(u) },
    { label: 'Fecha de creación', flex: '0 0 18%', meta: true, render: (u) => formatDate(u.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={units}
      getKey={(unit) => unit.id}
      loading={loading}
      actions={[
        { icon: <VisibilityIcon fontSize="small" />, label: 'Ver', color: 'info.main', onClick: onView },
        { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron unidades."
    />
  );
}