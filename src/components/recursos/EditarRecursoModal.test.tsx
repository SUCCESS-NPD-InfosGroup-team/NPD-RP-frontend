// src/components/recursos/EditarRecursoModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditarRecursoModal } from './EditarRecursoModal';
import type { Recurso } from '../../types';

const mockRecurso: Recurso = {
  id: '1', nEmpleado: '1045', nombre: 'Ana Torres', rol: 'Developer', cliente: 'COPA', proyecto: 'Proyecto Alpha', liderNPD: 'Lorena Batista', nivel: 'N3', estado: 'Activo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
};

// 🛠️ Función para renderizar el modal
const renderModal = (onSave = vi.fn()) => {
  render(<EditarRecursoModal recurso={mockRecurso} onClose={vi.fn()} onSave={onSave} />);
  return { onSave };
};

describe('EditarRecursoModal (HU-02)', () => {
  
  it('debe renderizar los datos actuales del recurso en el formulario', () => {
    renderModal();
    expect(screen.getByText(/Editar Recurso: Ana Torres/i)).toBeTruthy();
    expect(screen.getByDisplayValue('COPA')).toBeTruthy();
    expect(screen.getByDisplayValue('Developer')).toBeTruthy();
  });

  it('debe mostrar error si se intenta guardar con campos obligatorios vacíos (CA-02)', () => {
    renderModal();
    const inputCliente = screen.getByDisplayValue('COPA');
    fireEvent.change(inputCliente, { target: { value: '' } });
    fireEvent.click(screen.getByText(/Guardar Cambios/i));
    expect(screen.getByText(/El cliente, rol y nivel son obligatorios/i)).toBeTruthy();
  });

  it('debe mostrar error si la fecha de fin es anterior a la de inicio (CA-02)', () => {
    renderModal();
    const inputFechaFin = screen.getByDisplayValue('2026-12-31');
    fireEvent.change(inputFechaFin, { target: { value: '2025-01-01' } });
    fireEvent.click(screen.getByText(/Guardar Cambios/i));
    expect(screen.getByText(/La fecha de fin no puede ser anterior a la fecha de inicio/i)).toBeTruthy();
  });

  it('debe llamar a onSave con los datos actualizados al guardar correctamente (CA-01)', () => {
    const { onSave } = renderModal();
    const inputNivel = screen.getByDisplayValue('N3');
    fireEvent.change(inputNivel, { target: { value: 'N4' } });
    fireEvent.click(screen.getByText(/Guardar Cambios/i));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ nivel: 'N4' }));
  });
});