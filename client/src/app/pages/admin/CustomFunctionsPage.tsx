import { useEffect, useState } from 'react';
import { Box, Pagination, Stack, TextField } from '@mui/material';
import {
  customFunctionService,
  type CustomFunction,
} from '../../../services/customFunctionService';
import type { PageMeta, ServiceError } from '../../../services/common';

import CustomFunctionToolbar from '../../../features/admin/custom_function/CustomFunctionToolbar';
import CustomFunctionList from '../../../features/admin/custom_function/CustomFunctionList';
import ModalForm from '../../../components/modals/ModalForm';
import { useSnackbar } from '../../../context/SnackbarContext';

const LIMIT = 10;

export default function CustomFunctionsPage() {
  const [functions, setFunctions] = useState<CustomFunction[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewTarget, setViewTarget] = useState<CustomFunction | null>(null);

  const snackbar = useSnackbar();

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmedSearch = search.trim();
      if (trimmedSearch !== appliedFilter) {
        setAppliedFilter(trimmedSearch);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, appliedFilter]);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    customFunctionService.getCustomFunctions({ page, limit: LIMIT, filter: appliedFilter })
      .then((res) => {
        if (!isSubscribed) return;
        setFunctions(res.data ?? []);
        setMeta(res.meta);
      })
      .catch((error) => {
        if (!isSubscribed) return;
        const e = error as ServiceError;
        snackbar.error(e.message ?? 'Error del servidor al cargar funciones personalizadas.');
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });
    return () => { isSubscribed = false; };
  }, [page, appliedFilter]);

  const totalPages = meta?.total_pages ?? 1;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <CustomFunctionToolbar search={search} onSearchChange={setSearch} />

      <CustomFunctionList
        functions={functions}
        loading={loading}
        onView={setViewTarget}
      />

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" shape="rounded" />
        </Box>
      )}

      <ModalForm
        open={!!viewTarget}
        title="Ver Función Personalizada"
        onClose={() => setViewTarget(null)}
        onConfirm={() => setViewTarget(null)}
        confirmLabel="Cerrar"
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Nombre"
            value={viewTarget?.name ?? ''}
            size="small"
            fullWidth
            disabled
          />
          <TextField
            label="Descripción"
            value={viewTarget?.description ?? ''}
            size="small"
            fullWidth
            multiline
            rows={3}
            disabled
          />
        </Stack>
      </ModalForm>
    </Box>
  );
}
