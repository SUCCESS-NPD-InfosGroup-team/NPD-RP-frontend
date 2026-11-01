# Pruebas de Usuarios y roles

## Pruebas automatizadas

Ejecutar desde la raíz del proyecto:

```powershell
npm test -- --run src/services/users.test.ts
```

La suite comprueba:

1. Carga de los usuarios iniciales y creación de una cuenta activa.
2. Rechazo de correos duplicados sin distinguir mayúsculas y minúsculas.
3. Errores simulados de autorización y proveedor de identidad.

## Prueba manual con mock

1. Ejecuta `npm run dev`.
2. Inicia sesión con un usuario que tenga `operations-administrator`.
3. Abre `/usuarios`.
4. Verifica que aparezca la lista y el contador de usuarios.
5. Pulsa **Crear usuario** y confirma que el drawer ocupe el alto disponible.
6. Envía el formulario vacío y verifica los mensajes de validación.
7. Registra un nombre, correo y rol válidos; confirma el mensaje de éxito.
8. Repite el correo existente y confirma el error de duplicado.
9. Pulsa **Editar**, **Reactivar** y **Matriz de permisos**; deben ser
   controles disponibles, aunque todavía no ejecuten cambios.

## Prueba manual contra API

1. Configura `VITE_USERS_API_MODE=http`.
2. Inicia el backend con los endpoints del módulo `access`.
3. Ejecuta el mismo flujo manual.
4. Comprueba en la red del navegador que las solicitudes sean:
   `GET /api/v1/access/users` y `POST /api/v1/access/users`.
5. Verifica las respuestas `403`, `409`, `502` y `503` en la interfaz.

La autorización real corresponde al backend. El frontend solo oculta o muestra
controles para mejorar la experiencia de usuario.
