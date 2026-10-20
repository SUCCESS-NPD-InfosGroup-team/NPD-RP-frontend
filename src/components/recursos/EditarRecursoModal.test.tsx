import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditarRecursoModal } from './EditarRecursoModal';
import type { Recurso } from '../../types';

// Datos de prueba
const mockRecurso: Recurso = {
  id: '1', nEmpleado: '1045', nombre: 'Ana Torres', rol: 'Developer', cliente: 'COPA', proyecto: 'Proyecto Alpha', liderNPD: 'Lorena Batista', nivel: 'N3', estado: 'Activo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
};

const renderModal = (onSave = vi.fn()) => {
  render(<EditarRecursoModal recurso={mockRecurso} onClose={vi.fn()} onSave={onSave} />);
  return { onSave };
};

describe('EditarRecursoModal (HU-02)', () => {
  it('debe renderizar los datos actuales del recurso', () => {
    renderModal();
    expect(screen.getByText(/Editar Recurso: Ana Torres/i)).toBeTruthy();
    expect(screen.getByDisplayValue('COPA')).toBeTruthy();
  });

  it('debe mostrar error si faltan campos obligatorios (CA-02)', () => {
    renderModal();
    fireEvent.change(screen.getByDisplayValue('COPA'), { target: { value: '' } });
    fireEvent.click(screen.getByText(/Guardar Cambios/i));
    expect(screen.getByText(/El cliente, rol y nivel son obligatorios/i)).toBeTruthy();
  });

  it('debe mostrar error si la fecha de fin es anterior (CA-02)', () => {
    renderModal();
    fireEvent.change(screen.getByDisplayValue('2026-12-31'), { target: { value: '2025-01-01' } });
    fireEvent.click(screen.getByText(/Guardar Cambios/i));
    expect(screen.getByText(/La fecha de fin no puede ser anterior/i)).toBeTruthy();
  });

  it('debe llamar a onSave con los datos actualizados (CA-01)', () => {
    const { onSave } = renderModal();
    fireEvent.change(screen.getByDisplayValue('N3'), { target: { value: 'N4' } });
    fireEvent.click(screen.getByText(/Guardar Cambios/i));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ nivel: 'N4' }));
  });
});