import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {Typography, Tooltip, Box} from '@mui/material';

import DataTable, {type DataColumn} from '../../../components/DataTable';
import {formatOracleDate} from '../../../services/common';
import {
  STATUS_COLORS,
  STATUS_TRANSLATIONS,
} from '../../../services/declarationConstants';
import type {Declaration} from '../../../services/declarationsService';

interface AdminDeclarationsListProps {
  declarations: Declaration[];
  loading: boolean;
  onView: (declaration: Declaration) => void;
  onDownloadCsv: (declaration: Declaration) => void;
}

export default function DeclarationsList(
  {
    declarations,
    loading,
    onView,
    onDownloadCsv,
  }: AdminDeclarationsListProps) {
  const columns: DataColumn<Declaration>[] = [
      {
        label: 'Usuario',
        flex: '1.2',
        primary: true,
        render: (d) => (

          <Box>
            <Typography variant="body2" fontWeight={500}>
              {[
                d.user?.first_name,
                d.user?.second_name,
                d.user?.first_last_name,
                d.user?.second_last_name,
              ]
                .filter(Boolean)
                .join(' ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {d.user?.email ?? '—'}
            </Typography>
          </Box>
        ),
      },
      {
        label: 'Nº Plaza',
        flex:
          '1.2',
        truncate:
          true,
        render:
          (d) => {
            const position = d.job_position?.job_position_number ?? '—';
            const jobCode = d.job?.job_code ? `(${d.job.job_code}) ` : '';
            const jobName = d.job?.name ?? '—';
            const displayText = `${position} - ${jobCode}${jobName}`;
            return (
              <Tooltip title={displayText} arrow>
                <Typography variant="body2" noWrap>
                  {displayText}
                </Typography>
              </Tooltip>
            );
          },
      }
      ,
      {
        label: 'Fecha de creación',
        flex:
          '0.8',
        meta:
          true,
        render:
          (d) => formatOracleDate(d.created_at, true),
      }
      ,
      {
        label: 'Estado',
        flex:
          '0.8',
        render:
          (d) => {
            const status = d.current_status;
            const translated = STATUS_TRANSLATIONS[status as keyof typeof STATUS_TRANSLATIONS] || status;
            const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#757575';
            return (
              <Typography variant="body2" sx={{fontWeight: 500, color}}>
                {translated}
              </Typography>
            );
          },
      }
      ,
    ]
  ;

  return (
    <DataTable
      columns={columns}
      items={declarations}
      getKey={(d) => d.declaration_id}
      loading={loading}
      minWidth={700}
      actions={[
        {
          icon: <VisibilityIcon fontSize="small"/>,
          label: 'Ver detalles',
          color: 'primary.main',
          onClick: onView,
        },
        {
          icon: <DownloadOutlinedIcon fontSize="small"/>,
          label: 'Descargar CSV',
          color: '#666',
          onClick: onDownloadCsv,
        },
      ]}
      emptyMessage="No se encontraron declaraciones."
    />
  );
}