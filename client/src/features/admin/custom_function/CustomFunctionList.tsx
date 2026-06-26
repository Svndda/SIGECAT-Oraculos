import VisibilityIcon from '@mui/icons-material/Visibility';
import { Tooltip, Typography } from '@mui/material';
import type { CustomFunction } from '../../../services/customFunctionService';
import DataTable, { type DataColumn } from '../../../components/DataTable';

interface CustomFunctionListProps {
  functions: CustomFunction[];
  loading: boolean;
  onView: (fn: CustomFunction) => void;
}

export default function CustomFunctionList({
  functions,
  loading,
  onView
}: CustomFunctionListProps) {
  const columns: DataColumn<CustomFunction>[] = [
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
      label: 'Descripción',
      flex: '0 0 45%',
      truncate: true,
      render: (f) => (
        <Tooltip title={f.description ?? '—'} arrow>
          <Typography variant="body2" noWrap color="text.secondary">
            {f.description ?? '—'}
          </Typography>
        </Tooltip>
      )
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
        }
      ]}
      emptyMessage="No se encontraron funciones personalizadas."
    />
  );
}
