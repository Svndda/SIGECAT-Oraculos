import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Tooltip, Typography } from '@mui/material';
import type { OfficialFunction } from '../../../services/officialFunctionService';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import { formatOracleDate } from '../../../services/common';

interface FunctionListProps {
  functions: OfficialFunction[];
  loading: boolean;
  jobMap: Map<string, string>;
  onEdit: (fn: OfficialFunction) => void;
  onDelete: (fn: OfficialFunction) => void;
  onView: (fn: OfficialFunction) => void;
}

export default function FunctionList({
  functions,
  loading,
  jobMap,
  onEdit,
  onDelete,
  onView
}: FunctionListProps) {
  const columns: DataColumn<OfficialFunction>[] = [
    {
      label: 'Nombre',
      flex: '1',
      primary: true,
      truncate: true,
      render: (f) => (
        <Tooltip title={f.name} arrow>
          <Typography variant="body2" noWrap>
            {f.name}
          </Typography>
        </Tooltip>
      )
    },
    {
      label: 'Tipo de Puesto',
      flex: '0 0 25%',
      render: (f) => jobMap.get(f.job_id) ?? 'Cargando puesto...'
    },
    {
      label: 'Tiempo esperado (h)',
      flex: '0 0 15%',
      meta: true,
      render: (f) => (f.expected_time != null ? String(f.expected_time) : '—')
    },
    {
      label: 'Fecha de creación',
      flex: '0 0 15%',
      meta: true,
      render: (f) => formatOracleDate(f.created_at)
    }
  ];

  return (
    <DataTable
      columns={columns}
      items={functions}
      getKey={(f) => f.id}
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
      emptyMessage="No se encontraron funciones."
    />
  );
}
