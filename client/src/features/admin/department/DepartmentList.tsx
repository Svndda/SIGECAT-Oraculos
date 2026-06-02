import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Department } from '../../../services/departmentService';
import DataTable, { type DataColumn } from '../../../components/DataTable';

interface DepartmentListProps {
  departments: Department[];
  loading: boolean;
  areaMap: Map<string, string>;
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function DepartmentList(
  { departments, loading, areaMap, onEdit, onDelete }: DepartmentListProps
) {
  const columns: DataColumn<Department>[] = [
    { label: 'Nombre', flex: '0 0 25%', primary: true, render: (d) => d.name },
    { label: 'Descripción', flex: '1', truncate: true, render: (d) => d.description ?? '—' },
    { label: 'Área', flex: '0 0 20%', render: (d) => areaMap.get(d.area_id) ?? 'Cargando Área...' },
    { label: 'Fecha de creación', flex: '0 0 15%', meta: true, render: (d) => formatDate(d.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={departments}
      getKey={(d) => d.department_id}
      loading={loading}
      minWidth={800}
      actions={[
        { icon: <EditIcon fontSize="small" />, label: 'Editar', onClick: onEdit },
        { icon: <DeleteIcon fontSize="small" />, label: 'Eliminar', onClick: (d) => onDelete(d.department_id) },
      ]}
      emptyMessage="No se encontraron departamentos."
    />
  );
}
