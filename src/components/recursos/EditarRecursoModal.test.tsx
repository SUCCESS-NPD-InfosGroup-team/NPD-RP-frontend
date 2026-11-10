// src/components/recursos/EditarRecursoModal.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditarRecursoModal } from './EditarRecursoModal';
import * as api from '../../services/api';
import type { Recurso } from '../../types';

const MOCK_RECURSO: Recurso = {
  id: '1',
  nEmpleado: '#1045',
  nombre: 'Ana Torres',
  rol: 'QA Funcional',
  cliente: 'BANESCO',
  proyecto: 'Programa de automatización',
  liderNPD: 'Lorena Batista',
  nivel: 'N3',
  estado: 'Activo',
  fechaInicio: '2026-09-01',
  fechaFin: '2027-03-01',
  version: 1
};

describe('EditarRecursoModal', () => {
  it('debe renderizar el formulario con los datos del recurso', () => {
    render(
      <EditarRecursoModal 
        recurso={MOCK_RECURSO} 
        onClose={vi.fn()} 
        onSave={vi.fn()} 
      />
    );
    
    expect(screen.getByDisplayValue('Ana Torres')).toBeTruthy();
    expect(screen.getByDisplayValue('#1045')).toBeTruthy();
  });

  it('debe llamar a onClose al hacer clic en Cancelar', () => {
    const onCloseMock = vi.fn();
    render(
      <EditarRecursoModal 
        recurso={MOCK_RECURSO} 
        onClose={onCloseMock} 
        onSave={vi.fn()} 
      />
    );
    
    const btnCancel = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(btnCancel);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('debe enviar el payload correcto al guardar y llamar a onSave', async () => {
    const onSaveMock = vi.fn();
    const updateSpy = vi.spyOn(api, 'updateRecurso').mockResolvedValue({});
    
    render(
      <EditarRecursoModal 
        recurso={MOCK_RECURSO} 
        onClose={vi.fn()} 
        onSave={onSaveMock} 
      />
    );
    
    const inputNombre = screen.getByDisplayValue('Ana Torres');
    fireEvent.change(inputNombre, { target: { value: 'Ana Torres Modificada' } });
    
    const btnGuardar = screen.getByRole('button', { name: /Guardar Cambios/i });
    
    await act(async () => {
      fireEvent.click(btnGuardar);
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('1', expect.objectContaining({
        name: 'Ana Torres Modificada',
        employeeNumber: '#1045',
        version: 1
      }));
      expect(onSaveMock).toHaveBeenCalled();
    });
  });
});