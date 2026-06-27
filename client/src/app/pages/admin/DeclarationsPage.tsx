// src/pages/admin/DeclarationsPage.tsx
import {useCallback, useEffect, useMemo, useState} from 'react';

import {
  Box,
  CircularProgress,
  Pagination,
  Paper,
  Typography
} from '@mui/material';

import DeclarationDetailModal
  from '../../../features/admin/declarations/DeclarationsDetailsModal';
import DeclarationsList
  from '../../../features/admin/declarations/DeclarationsList';
import DeclarationsToolbar
  from '../../../features/admin/declarations/DeclarationsToolbar';
import {useSnackbar} from '../../../context/SnackbarContext';
import type {ServiceError} from '../../../services/common';
import type {Declaration} from '../../../services/declarationsService';
import {declarationService} from '../../../services/declarationsService';

const PAGE_LIMIT = 10;
const MAX_LIMIT = 500;

export default function DeclarationsPage() {
  const snackbar = useSnackbar();

  const [allDeclarations, setAllDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<Declaration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDeclarations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {page: 1, limit: MAX_LIMIT};
      const res = await declarationService.getDeclarations(params);
      setAllDeclarations(res.data);
    } catch (error) {
      const e = error as ServiceError;
      snackbar.error(e.message ?? 'Error al cargar las declaraciones.');
    } finally {
      setLoading(false);
    }
  }, [snackbar]);

  useEffect(() => {
    loadDeclarations();
  }, [loadDeclarations]);

  const filteredDeclarations = useMemo(() => {
    let result = allDeclarations;

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((dec) => {
        const fullName = `${dec.user?.first_name ?? ''} ${dec.user?.second_name ?? ''} ${dec.user?.first_last_name ?? ''} ${dec.user?.second_last_name ?? ''}`.toLowerCase();
        const jobName = dec.job?.name?.toLowerCase() ?? '';
        return fullName.includes(term) || jobName.includes(term);
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter((dec) => dec.current_status === statusFilter);
    }

    return result;
  }, [allDeclarations, search, statusFilter]);

  const totalPages = Math.ceil(filteredDeclarations.length / PAGE_LIMIT) || 1;
  const paginatedDeclarations = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredDeclarations.slice(start, start + PAGE_LIMIT);
  }, [filteredDeclarations, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleViewDetail = async (declaration: Declaration) => {
    setDetailLoading(true);
    try {
      const fullDeclaration = await declarationService.getDeclarationById(
        declaration.declaration_id,
        true
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

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedDeclaration(null);
  };

  const handleStatusChange = async () => {
    await loadDeclarations();
    if (selectedDeclaration) {
      try {
        const updated = await declarationService.getDeclarationById(
          selectedDeclaration.declaration_id,
          true
        );
        setSelectedDeclaration(updated);
      } catch {
        handleCloseDetail();
      }
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters = !!search.trim() || statusFilter !== 'all';

  return (
    <Box sx={{p: {xs: 2, sm: 4}, minHeight: '100%'}}>
      <Typography variant="h5" sx={{mb: 3, fontWeight: 600}}>
        Gestión de Declaraciones
      </Typography>

      <Paper sx={{mb: 3, p: {xs: 2, sm: 3}}}>
        <DeclarationsToolbar
          search={search}
          onSearchChange={setSearch}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </Paper>

      <Paper sx={{overflow: 'hidden'}}>
        <DeclarationsList
          declarations={paginatedDeclarations}
          loading={loading}
          onView={handleViewDetail}
        />
        {loading && (
          <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}>
            <CircularProgress/>
          </Box>
        )}
      </Paper>

      {totalPages > 1 && (
        <Box sx={{display: 'flex', justifyContent: 'center', mt: 3}}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      <DeclarationDetailModal
        open={detailOpen}
        declaration={selectedDeclaration}
        onClose={handleCloseDetail}
        onStatusChange={handleStatusChange}
        loading={detailLoading}
      />
    </Box>
  );
}