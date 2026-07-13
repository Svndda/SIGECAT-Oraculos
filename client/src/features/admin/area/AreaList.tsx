import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Tooltip,
  Typography,
} from '@mui/material';

import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { Area } from '../../../services/areaService';
import { truncateText } from '../../../utils/text';

interface AreaListProps {
  areas: Area[];
  loading: boolean;
  onEdit: (area: Area) => void;
  onDelete: (area: Area) => void;
  onView: (area: Area) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function AreaList({ areas, loading, onEdit, onDelete, onView }: AreaListProps) {
  const columns: DataColumn<Area>[] = [
    {
      label: 'Nombre',
      flex: '1',
      primary: true,
      truncate: true,
      render: (a) => (
        <Tooltip title={a.name} arrow>
          <Typography variant="body2" fontWeight={600} noWrap>
            {a.name}
          </Typography>
        </Tooltip>
      ),
    },
    { label: 'Fecha de creación', flex: '0 0 160px', meta: true, render: (a) => formatDate(a.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={areas}
      getKey={(area) => area.area_id}
      loading={loading}
      actions={[
        { icon: <VisibilityIcon fontSize="small" />, label: 'Ver', color: 'info.main', onClick: onView },
        { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron áreas."
    />
  );
}