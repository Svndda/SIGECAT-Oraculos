import axios from 'axios';

export interface RegistroCompleto {
  id: string;
  fecha: string;
  nombre: string;
  cedula: string;
  correoInstitucional: string;
  codigoEmpleado: string;
  relacionUCR: string;
  lugarTrabajo: string;
  numeroPlaza: string;
  claseOcupacional: {
    id: string;
    codigo: string;
    estrato: string;
    descripcion: string;
  } | null;
  jornadaLaboral: string;
  horarioInicio: string;
  horarioFinal: string;
  objetivo: string;
  estadoLeido: boolean;
  horas: Array<{
    id: number;
    dia: string;
    tipoTarea: 'propias' | 'apoyo' | 'otros';
    horaInicio: string;
    horaFin: string;
    horas: number;
    minutos: number;
  }>;
}

// Configurar base URL para axios
const API_BASE = 'http://localhost:3001/api';

// Funciones para trabajar con la API simulada
export const registrosService = {
  // Obtener todos los registros
  async getRegistros(): Promise<RegistroCompleto[]> {
    try {
      const response = await axios.get(`${API_BASE}/registros`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener registros:', error);
      return [];
    }
  },

  // Guardar un nuevo registro
  async guardarRegistro(registro: Omit<RegistroCompleto, 'id' | 'fecha'>): Promise<RegistroCompleto> {
    try {
      const nuevoRegistro: RegistroCompleto = {
        ...registro,
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
      };

      const response = await axios.post(`${API_BASE}/registros`, nuevoRegistro);
      return response.data;
    } catch (error) {
      console.error('Error al guardar registro:', error);
      throw error;
    }
  },

  // Obtener un registro por ID
  async obtenerRegistro(id: string): Promise<RegistroCompleto | null> {
    try {
      const response = await axios.get(`${API_BASE}/registros/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener registro:', error);
      return null;
    }
  },

  // Actualizar un registro
  async actualizarRegistro(id: string, registro: Omit<RegistroCompleto, 'id' | 'fecha'>): Promise<RegistroCompleto> {
    try {
      const response = await axios.put(`${API_BASE}/registros/${id}`, registro);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar registro:', error);
      throw error;
    }
  },

  // Eliminar un registro
  async eliminarRegistro(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE}/registros/${id}`);
    } catch (error) {
      console.error('Error al eliminar registro:', error);
      throw error;
    }
  },
};
