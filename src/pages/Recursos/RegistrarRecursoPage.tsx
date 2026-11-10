// src/pages/Recursos/RegistrarRecursoPage.tsx

export const RegistrarRecursoPage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px' }}>Registrar Recurso</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Completa el formulario para añadir un nuevo colaborador al sistema.
        </p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '600px' }}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>N° Empleado</label>
            <input type="text" placeholder="Ej. 1102" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Nombre Completo</label>
            <input type="text" placeholder="Ej. Laura Gómez" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
            <input type="email" placeholder="laura.gomez@infosgroup.com" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Nivel</label>
              <input type="number" min="1" max="5" placeholder="1" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>Fecha de Ingreso</label>
              <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" style={{ padding: '8px 16px', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '8px 16px', border: 'none', background: '#E85D04', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Guardar Recurso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
