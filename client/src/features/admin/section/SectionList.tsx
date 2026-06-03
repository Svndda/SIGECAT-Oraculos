import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Section } from '../../../services/sectionService';
import DataTable, { type DataColumn } from '../../../components/DataTable';

interface SectionListProps {
  sections: Section[];
  loading: boolean;
  areaMap: Map<string, string>;
  onEdit: (section: Section) => void;
  onDelete: (section: Section) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function SectionList({ sections, loading, areaMap, onEdit, onDelete }: SectionListProps) {
  const columns: DataColumn<Section>[] = [
    { label: 'Nombre', flex: '0 0 24%', primary: true, render: (s) => s.name },
    { label: 'Descripción', flex: '1', truncate: true, render: (s) => s.description ?? '—' },
    { label: 'Área', flex: '0 0 18%', render: (s) => areaMap.get(s.area_id) ?? '—' },
    { label: 'Fecha de creación', flex: '0 0 18%', meta: true, render: (s) => formatDate(s.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={sections}
      getKey={(s) => s.section_id}
      loading={loading}
      minWidth={800}
      actions={[
        { icon: <EditIcon fontSize="small" />, label: 'Editar', onClick: onEdit },
        { icon: <DeleteIcon fontSize="small" />, label: 'Eliminar', onClick: onDelete },
      ]}
      emptyMessage="No se encontraron secciones."
    />
  );
}