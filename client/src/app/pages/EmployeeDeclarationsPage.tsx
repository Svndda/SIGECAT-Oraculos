import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { Box } from '@mui/material';
import Pagination from '@mui/material/Pagination';

import { useSnackbar } from '../../context/SnackbarContext';
import EmployeeDeclarationsToolbar
  from '../../features/employee/EmployeeDeclarationsToolbar';
import EmployeeDeclarationsList
  from '../../features/employee/EmployeesDeclarationsList';
import EmployeeDeclarationDetailModal
  from '../../features/employee/EmployeesDeclarationsModal';
import type {
  PageMeta,
  ServiceError,
} from '../../services/common';
import type { Declaration } from '../../services/declarationsService';
import { declarationService } from '../../services/declarationsService';

const LIMIT = 10;

export default function EmployeeDeclarationsPage() {
  const navigate = useNavigate();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<Declaration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const snackbar = useSnackbar();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilter(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadDeclarations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await declarationService.getMyDeclarations({
        page,
        limit: LIMIT,
        filter: appliedFilter,
      });
      setDeclarations(res.data);
      setMeta(res.meta);
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error del servidor.');
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilter, snackbar]);

  useEffect(() => {
    loadDeclarations();
  }, [loadDeclarations]);

  const totalPages = meta?.total_pages ?? 1;

  const openDetail = async (declaration: Declaration) => {
    setDetailLoading(true);
    try {
      const fullDeclaration = await declarationService.getDeclarationById(
        declaration.declaration_id,
        true // includeHistory
      );
      setSelectedDeclaration(fullDeclaration);
      setDetailOpen(true);
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error al cargar los detalles.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedDeclaration(null);
  };

  const handleCreate = () => {
    navigate('/declaracion-registro');
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, minHeight: '100%' }}>
      <EmployeeDeclarationsToolbar
        search={search}
        onSearchChange={setSearch}
        onCreateClick={handleCreate}
      />

      <EmployeeDeclarationsList
        declarations={declarations}
        loading={loading}
        onView={openDetail}
      />

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      <EmployeeDeclarationDetailModal
        open={detailOpen}
        declaration={selectedDeclaration}
        onClose={closeDetail}
        loading={detailLoading}
      />
    </Box>
  );
}