// src/components/recursos/EditarRecursoModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditarRecursoModal } from './EditarRecursoModal';
import type { Recurso } from '../../types';

// Datos de prueba (Mock)
const mockRecurso: Recurso = {
  id: '1',
  nEmpleado: '1045',
  nombre: 'Ana Torres',
  rol: 'Developer',
  cliente: 'COPA',
  proyecto: 'Proyecto Alpha',
  liderNPD: 'Lorena Batista',
  nivel: 'N3',
  estado: 'Activo',
  fechaInicio: '2026-01-01',
  fechaFin: '2026-12-31',
};

describe('EditarRecursoModal (HU-02)', () => {
  
  it('debe renderizar los datos actuales del recurso en el formulario', () => {
    render(
      <EditarRecursoModal 
        recurso={mockRecurso} 
        onClose={vi.fn()} 
        onSave={vi.fn()} 
      />
    );

    // Usamos toBeTruthy() en lugar de toBeInTheDocument()
    expect(screen.getByText(/Editar Recurso: Ana Torres/i)).toBeTruthy();
    expect(screen.getByDisplayValue('COPA')).toBeTruthy();
    expect(screen.getByDisplayValue('Developer')).toBeTruthy();
  });

  it('debe mostrar error si se intenta guardar con campos obligatorios vacíos (CA-02)', () => {
    render(
      <EditarRecursoModal 
        recurso={mockRecurso} 
        onClose={vi.fn()} 
        onSave={vi.fn()} 
      />
    );

    // Borramos el cliente
    const inputCliente = screen.getByDisplayValue('COPA');
    fireEvent.change(inputCliente, { target: { value: '' } });

    // Hacemos clic en guardar
    const btnGuardar = screen.getByText(/Guardar Cambios/i);
    fireEvent.click(btnGuardar);

    // Verificamos que salga el mensaje de error
    expect(screen.getByText(/El cliente, rol y nivel son obligatorios/i)).toBeTruthy();
  });

  it('debe mostrar error si la fecha de fin es anterior a la de inicio (CA-02)', () => {
    render(
      <EditarRecursoModal 
        recurso={mockRecurso} 
        onClose={vi.fn()} 
        onSave={vi.fn()} 
      />
    );

    // Cambiamos la fecha de fin a una anterior
    const inputFechaFin = screen.getByDisplayValue('2026-12-31');
    fireEvent.change(inputFechaFin, { target: { value: '2025-01-01' } });

    const btnGuardar = screen.getByText(/Guardar Cambios/i);
    fireEvent.click(btnGuardar);

    expect(screen.getByText(/La fecha de fin no puede ser anterior a la fecha de inicio/i)).toBeTruthy();
  });

  it('debe llamar a onSave con los datos actualizados al guardar correctamente (CA-01)', () => {
    const onSaveMock = vi.fn();
    
    render(
      <EditarRecursoModal 
        recurso={mockRecurso} 
        onClose={vi.fn()} 
        onSave={onSaveMock} 
      />
    );

    // Cambiamos el nivel a N4
    const inputNivel = screen.getByDisplayValue('N3');
    fireEvent.change(inputNivel, { target: { value: 'N4' } });

    const btnGuardar = screen.getByText(/Guardar Cambios/i);
    fireEvent.click(btnGuardar);

    // Verificamos que onSave haya sido llamado con el nivel cambiado
    expect(onSaveMock).toHaveBeenCalledWith(expect.objectContaining({
      nivel: 'N4'
    }));
  });

});