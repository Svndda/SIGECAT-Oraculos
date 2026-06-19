import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Job } from '../../../services/jobService';
import DataTable, { type DataColumn } from '../../../components/DataTable';

interface JobListProps {
  jobs: Job[];
  loading: boolean;
  jobClassMap: Map<string, string>;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return dateStr.split(' ')[0];
}

export default function JobList(
  { jobs, loading, jobClassMap, onEdit, onDelete }: JobListProps
) {
  const columns: DataColumn<Job>[] = [
    { label: 'Código', flex: '0 0 12%', render: (j) => j.job_code.toString() },
    { label: 'Nombre del Puesto', flex: '0 0 28%', primary: true, render: (j) => j.name },
    { label: 'Clase Ocupacional', flex: '0 0 20%', render: (j) => jobClassMap.get(j.job_class_id) ?? 'Cargando Clase...' },
    { label: 'Descripción', flex: '1', truncate: true, render: (j) => j.description ?? '—' },
    { label: 'Fecha de creación', flex: '0 0 15%', meta: true, render: (j) => formatDate(j.created_at) },
  ];

  return (
    <DataTable
      columns={columns}
      items={jobs}
      getKey={(j) => j.job_id}
      loading={loading}
      minWidth={850}
      actions={[
        { icon: <EditIcon fontSize="small" />, label: 'Editar', onClick: onEdit },
        { icon: <DeleteOutlineIcon fontSize="small" />, label: 'Eliminar', onClick: onDelete, color: 'error.main' },
      ]}
      emptyMessage="No se encontraron puestos de trabajo."
    />
  );
}