import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Tooltip,
  Typography,
} from '@mui/material';

import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { Department } from '../../../services/departmentService';

interface DepartmentListProps {
  departments: Department[];
  loading: boolean;
  areaMap: Map<string, string>;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  onView: (dept: Department) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function DepartmentList(
  { departments, loading, areaMap, onEdit, onDelete, onView }: DepartmentListProps
) {
  const columns: DataColumn<Department>[] = [
    {
      label: 'Nombre',
      flex: '1',
      primary: true,
      truncate: true,
      render: (d) => (
        <Tooltip title={d.name} arrow>
          <Typography variant="body2" fontWeight={600} noWrap>
            {d.name}
          </Typography>
        </Tooltip>
      ),
    },
    { label: 'Área', flex: '1', truncate: true, render: (d) => areaMap.get(d.area_id) ?? 'Cargando Área...' },
    { label: 'Fecha de creación', flex: '0 0 160px', meta: true, render: (d) => formatDate(d.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={departments}
      getKey={(d) => d.department_id}
      loading={loading}
      minWidth={800}
      actions={[
        { icon: <VisibilityIcon fontSize="small" />, label: 'Ver', color: 'info.main', onClick: onView },
        { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron departamentos."
    />
  );
}