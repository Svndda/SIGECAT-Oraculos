import { Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DataTable, { type DataColumn } from '../../../components/DataTable';
import type { AdminUser } from '../../../services/userService';

interface UserListProps {
  users: AdminUser[];
  loading: boolean;
  onChangeRole: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export default function UserList({
  users,
  loading,
  onChangeRole,
  onDelete
}: UserListProps) {
  const columns: DataColumn<AdminUser>[] = [
    {
      label: 'Nombre completo',
      flex: '0 0 24%',
      primary: true,
      render: (u) => `${u.first_name} ${u.last_name}`,
    },
    { label: 'Correo institucional', flex: '1', truncate: true, render: (u) => u.email },
    {
      label: 'Rol',
      flex: '0 0 15%',
      badge: true,
      render: (u) => (
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            py: 0.4,
            borderRadius: 4,
            fontWeight: 600,
            backgroundColor: u.role === 'admin' ? '#e8edf7' : '#f0f0f0',
            color: u.role === 'admin' ? '#1a2b4a' : '#555',
          }}
        >
          {u.role === 'admin' ? 'Administrador' : 'Empleado'}
        </Typography>
      ),
    }
  ];

  return (
    <DataTable
      columns={columns}
      items={users}
      getKey={(u) => u.id}
      loading={loading}
      actions={[
        {
          icon: <AdminPanelSettingsIcon fontSize="small" />,
          label: 'Cambiar rol',
          color: '#1a2b4a',
          onClick: onChangeRole,
        },
        {
          icon: <DeleteOutlineIcon fontSize="small" />,
          label: 'Eliminar',
          color: '#9e9e9e',
          onClick: onDelete,
        },
      ]}
      emptyMessage="No se encontraron usuarios."
    />
  );
}