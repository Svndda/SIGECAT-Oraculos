import axios from 'axios';

export interface CompleteRecord {
  id: string;
  createdAt: string;
  name: string;
  idNumber: string;
  institutionalEmail: string;
  employeeCode: string;
  ucrRelationship: string;
  workLocation: string;
  plazaNumber: string;
  occupationalClass: {
    id: string;
    codigo: string;
    estrato: string;
    descripcion: string;
  } | null;
  workShift: string;
  startTime: string;
  endTime: string;
  objective: string;
  isRead: boolean;
  hours: Array<{
    id: number;
    dia: string;
    taskType: 'propias' | 'apoyo' | 'otros';
    startTime: string;
    endTime: string;
    hours: number;
    minutes: number;
  }>;
}

// Configure base URL for axios
const API_BASE = 'http://localhost:3001/api';

// Functions to work with the mock API
export const recordsService = {
  // Get all records
  async getRecords(): Promise<CompleteRecord[]> {
    try {
      const response = await axios.get(`${API_BASE}/records`);
      return response.data;
    } catch (error) {
      console.error('Error fetching records:', error);
      return [];
    }
  },

  // Save a new record
  async saveRecord(record: Omit<CompleteRecord, 'id' | 'createdAt'>): Promise<CompleteRecord> {
    try {
      const newRecord: CompleteRecord = {
        ...record,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const response = await axios.post(`${API_BASE}/records`, newRecord);
      return response.data;
    } catch (error) {
      console.error('Error saving record:', error);
      throw error;
    }
  },

  // Get a record by ID
  async getRecord(id: string): Promise<CompleteRecord | null> {
    try {
      const response = await axios.get(`${API_BASE}/records/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching record:', error);
      return null;
    }
  },

  // Update a record
  async updateRecord(id: string, record: Omit<CompleteRecord, 'id' | 'createdAt'>): Promise<CompleteRecord> {
    try {
      const response = await axios.put(`${API_BASE}/records/${id}`, record);
      return response.data;
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  },

  // Delete a record
  async deleteRecord(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE}/records/${id}`);
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  },
};
