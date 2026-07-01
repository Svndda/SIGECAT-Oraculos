import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Tooltip, Typography } from '@mui/material';

import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { LicenseType } from '../../../services/licenseTypeService';
import { truncateText } from '../../../utils/text';

interface LicenseTypeListProps {
  licenseTypes: LicenseType[];
  loading: boolean;
  onEdit: (licenseType: LicenseType) => void;
  onDelete: (licenseType: LicenseType) => void;
  onView: (licenseType: LicenseType) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function LicenseTypeList({ licenseTypes, loading, onEdit, onDelete, onView }: LicenseTypeListProps) {
  const columns: DataColumn<LicenseType>[] = [
    {
      label: 'Nombre',
      flex: '1',
      primary: true,
      truncate: true,
      render: (lt) => (
        <Tooltip title={lt.name} arrow>
          <Typography variant="body2" fontWeight={600} noWrap>
            {truncateText(lt.name)}
          </Typography>
        </Tooltip>
      ),
    },
    { label: 'Fecha de creación', flex: '1', meta: true, render: (lt) => formatDate(lt.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={licenseTypes}
      getKey={(lt) => lt.id}
      loading={loading}
      actions={[
        { icon: <VisibilityIcon fontSize="small" />, label: 'Ver', color: 'info.main', onClick: onView },
        { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron tipos de licencia."
    />
  );
}
