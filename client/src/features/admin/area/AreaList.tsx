import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { Area } from '../../../services/areaService';

interface AreaListProps {
  areas: Area[];
  loading: boolean;
  onEdit: (area: Area) => void;
  onDelete: (area: Area) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function AreaList({ areas, loading, onEdit, onDelete }: AreaListProps) {
  const columns: DataColumn<Area>[] = [
    { label: 'Nombre', flex: '0 0 26%', primary: true, render: (a) => a.name },
    { label: 'Descripción', flex: '1', truncate: true, render: (a) => a.description ?? '—' },
    { label: 'Fecha de creación', flex: '0 0 20%', meta: true, render: (a) => formatDate(a.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={areas}
      getKey={(area) => area.area_id}
      loading={loading}
      actions={[
        { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron áreas."
    />
  );
}