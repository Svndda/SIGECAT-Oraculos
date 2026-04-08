import React, { createContext, useContext, useState, useEffect } from 'react';
import type { RegistroCompleto } from '../services/registrosService';
import { registrosService } from '../services/registrosService';

interface RegistrosContextType {
  registros: RegistroCompleto[];
  cargarRegistros: () => Promise<void>;
  guardarRegistro: (registro: Omit<RegistroCompleto, 'id' | 'fecha'>) => Promise<RegistroCompleto>;
  eliminarRegistro: (id: string) => Promise<void>;
  registroActual: Omit<RegistroCompleto, 'id' | 'fecha'> | null;
  establecerRegistroActual: (registro: Omit<RegistroCompleto, 'id' | 'fecha'> | null) => void;
}

const RegistrosContext = createContext<RegistrosContextType | undefined>(undefined);

export const RegistrosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registros, setRegistros] = useState<RegistroCompleto[]>([]);
  const [registroActual, setRegistroActual] = useState<Omit<RegistroCompleto, 'id' | 'fecha'> | null>(null);

  const cargarRegistros = async () => {
    try {
      const data = await registrosService.getRegistros();
      setRegistros(data);
    } catch (error) {
      console.error('Error cargando registros:', error);
    }
  };

  const guardarRegistro = async (registro: Omit<RegistroCompleto, 'id' | 'fecha'>) => {
    try {
      const nuevoRegistro = await registrosService.guardarRegistro(registro);
      setRegistros([...registros, nuevoRegistro]);
      return nuevoRegistro;
    } catch (error) {
      console.error('Error guardando registro:', error);
      throw error;
    }
  };

  const eliminarRegistro = async (id: string) => {
    try {
      await registrosService.eliminarRegistro(id);
      setRegistros(registros.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error eliminando registro:', error);
      throw error;
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, []);

  const value: RegistrosContextType = {
    registros,
    cargarRegistros,
    guardarRegistro,
    eliminarRegistro,
    registroActual,
    establecerRegistroActual: setRegistroActual,
  };

  return (
    <RegistrosContext.Provider value={value}>
      {children}
    </RegistrosContext.Provider>
  );
};

export const useRegistros = () => {
  const context = useContext(RegistrosContext);
  if (!context) {
    throw new Error('useRegistros debe ser usado dentro de RegistrosProvider');
  }
  return context;
};
