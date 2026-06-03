import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { Unit } from '../../../services/unitService';

interface UnitListProps {
  units: Unit[];
  loading: boolean;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  belongsTo: (unit: Unit) => string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function UnitList({ units, loading, onEdit, onDelete, belongsTo }: UnitListProps) {
  const columns: DataColumn<Unit>[] = [
    { label: 'Nombre', flex: '0 0 26%', primary: true, render: (u) => u.name },
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
        { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron unidades."
    />
  );
}