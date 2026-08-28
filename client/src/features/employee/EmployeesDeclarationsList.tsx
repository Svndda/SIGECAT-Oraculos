import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Tooltip,
  Typography,
} from '@mui/material';

import DataTable, { type DataColumn } from '../../components/DataTable';
import { formatOracleDate } from '../../services/common';
import {
  STATUS_COLORS,
  STATUS_TRANSLATIONS,
} from '../../services/declarationConstants';
import type { Declaration } from '../../services/declarationsService';

interface EmployeeDeclarationsListProps {
  declarations: Declaration[];
  loading: boolean;
  onView: (declaration: Declaration) => void;
  onDownloadCsv: (declaration: Declaration) => void;
}

export default function EmployeeDeclarationsList({
  declarations,
  loading,
  onView,
  onDownloadCsv,
}: EmployeeDeclarationsListProps) {
  const columns: DataColumn<Declaration>[] = [
    {
      label: 'Cargo',
      flex: '1',
      primary: true,
      truncate: true,
      render: (d) => {
        const jobCode = d.job?.job_code ? `(${d.job.job_code}) ` : '';
        const jobName = d.job?.name ?? '—';
        const displayText = `${jobCode}${jobName}`;
        return (
          <Tooltip title={displayText} arrow>
            <Typography variant="body2" fontWeight={500} noWrap>
              {displayText}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      label: 'Nº Plaza',
      flex: '0.8',
      render: (d) => d.job_position?.job_position_number ?? '—',
    },
    {
      label: 'Estado',
      flex: '0.8',
      render: (d) => {
        const status = d.current_status;
        const translated = STATUS_TRANSLATIONS[status] || status;
        const color = STATUS_COLORS[status] || '#757575';
        return (
          <Typography variant="body2" sx={{ fontWeight: 500, color }}>
            {translated}
          </Typography>
        );
      },
    },
    {
      label: 'Fecha de creación',
      flex: '0.8',
      meta: true,
      render:
        (d) => formatOracleDate(d.created_at, true),
    },
  ];

  return (
    <DataTable
      columns={columns}
      items={declarations}
      getKey={(d) => d.declaration_id}
      loading={loading}
      minWidth={700}
      actions={[
        {
          icon: <VisibilityIcon fontSize="small" />,
          label: 'Ver detalles',
          color: 'info.main',
          onClick: onView,
        },
        {
          icon: <DownloadOutlinedIcon fontSize="small" />,
          label: 'Descargar CSV',
          color: '#666',
          onClick: onDownloadCsv,
        },
      ]}
      emptyMessage="No tienes declaraciones registradas."
    />
  );
}