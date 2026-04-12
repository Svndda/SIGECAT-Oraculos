import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CompleteRecord } from '../services/recordsService';
import { recordsService } from '../services/recordsService';

interface RecordsContextType {
  records: CompleteRecord[];
  loadRecords: () => Promise<void>;
  saveRecord: (record: Omit<CompleteRecord, 'id' | 'fecha'>) => Promise<CompleteRecord>;
  deleteRecord: (id: string) => Promise<void>;
  currentRecord: Omit<CompleteRecord, 'id' | 'fecha'> | null;
  setCurrentRecord: (record: Omit<CompleteRecord, 'id' | 'fecha'> | null) => void;
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

export const RecordsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<CompleteRecord[]>([]);
  const [currentRecord, setCurrentRecordState] = useState<Omit<CompleteRecord, 'id' | 'fecha'> | null>(null);

  const loadRecords = async () => {
    try {
      const data = await recordsService.getRecords();
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  const saveRecord = async (record: Omit<CompleteRecord, 'id' | 'fecha'>) => {
    try {
      const newRecord = await recordsService.saveRecord(record);
      setRecords([...records, newRecord]);
      return newRecord;
    } catch (error) {
      console.error('Error saving record:', error);
      throw error;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      await recordsService.deleteRecord(id);
      setRecords(records.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const value: RecordsContextType = {
    records,
    loadRecords,
    saveRecord,
    deleteRecord,
    currentRecord,
    setCurrentRecord: setCurrentRecordState,
  };

  return (
    <RecordsContext.Provider value={value}>
      {children}
    </RecordsContext.Provider>
  );
};

export const useRecords = () => {
  const context = useContext(RecordsContext);
  if (!context) {
    throw new Error('useRecords must be used within a RecordsProvider');
  }
  return context;
};
