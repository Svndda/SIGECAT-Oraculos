import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Tooltip,
  Typography,
} from '@mui/material';

import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { Section } from '../../../services/sectionService';
import { truncateText } from '../../../utils/text';

interface SectionListProps {
  sections: Section[];
  loading: boolean;
  areaMap: Map<string, string>;
  onEdit: (section: Section) => void;
  onDelete: (section: Section) => void;
  onView: (section: Section) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function SectionList({ sections, loading, areaMap, onEdit, onDelete, onView }: SectionListProps) {
  const columns: DataColumn<Section>[] = [
    {
      label: 'Nombre',
      flex: '1',
      primary: true,
      truncate: true,
      render: (s) => (
        <Tooltip title={s.name} arrow>
          <Typography variant="body2" fontWeight={600} noWrap>
            {truncateText(s.name)}
          </Typography>
        </Tooltip>
      ),
    },
    { label: 'Área', flex: '1', render: (s) => areaMap.get(s.area_id) ?? '—' },
    { label: 'Fecha de creación', flex: '1', meta: true, render: (s) => formatDate(s.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={sections}
      getKey={(s) => s.section_id}
      loading={loading}
      minWidth={800}
      actions={[
        { icon: <VisibilityIcon fontSize="small" />, label: 'Ver', color: 'info.main', onClick: onView },
        { icon: <EditIcon fontSize="small" />, label: 'Editar', color: '#1a2b4a', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', color: '#9e9e9e', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron secciones."
    />
  );
}