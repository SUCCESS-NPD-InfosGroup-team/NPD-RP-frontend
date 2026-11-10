// src/pages/Infosweb/InfoswebPage.tsx

export const InfoswebPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 60px)',
        backgroundColor: '#F5F5F5',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: '50px', marginBottom: '20px' }}>🔄</div>
        <span
          style={{
            backgroundColor: '#FED7AA',
            color: '#9A3412',
            padding: '5px 12px',
            borderRadius: '15px',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          En desarrollo
        </span>
        <h2 style={{ marginTop: '20px' }}>Integración con Infosweb</h2>
        <p style={{ color: '#666', lineHeight: '1.6', marginTop: '10px' }}>
          Estamos definiendo con el cliente cómo se conecta la plataforma con Infosweb.
          Mientras tanto, los recursos se registran y se editan a mano.
        </p>
        <div
          style={{
            textAlign: 'left',
            marginTop: '20px',
            backgroundColor: '#F9FAFB',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <p>✅ Registra cada alta nueva desde <strong>Registrar recurso</strong>.</p>
          <p>✅ Para una baja, edita el registro y cambia su <strong>Estado</strong>.</p>
          <p>✅ Todos los cambios quedan en la auditoría de cada recurso.</p>
        </div>
      </div>
    </div>
  );
};