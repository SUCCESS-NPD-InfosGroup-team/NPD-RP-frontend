# Usuarios y roles

La ruta `/usuarios` presenta la administración inicial de cuentas y roles de
la plataforma.

## Acceso

La pantalla se muestra únicamente a usuarios con el rol de Keycloak
`operations-administrator`. Esta validación controla la experiencia del
frontend; el backend debe validar los permisos de cada endpoint.

## Comportamiento disponible

- Lista de usuarios con nombre, correo, rol, estado y último acceso.
- Paginación preparada para 25 registros por página.
- Drawer vertical para crear usuarios, respetando la barra superior e inferior.
- Validación de nombre, correo y rol antes de enviar el formulario.
- Mensajes para correo duplicado, falta de permisos y proveedor no disponible.
- Acciones de editar, reactivar y matriz de permisos visibles pero todavía
  sin lógica de negocio.

## Integración API

La pantalla usa `usersApi`. Por defecto utiliza datos mock para desarrollo.
Para probar el cliente HTTP se debe configurar:

```text
VITE_USERS_API_MODE=http
```

Los endpoints esperados pertenecen al módulo `access`:

```text
GET  /api/v1/access/users
POST /api/v1/access/users
```

La implementación pasa siempre por `apiFetch('access', ...)` y no guarda
credenciales ni tokens en el navegador.

## Limitaciones conocidas

La creación de usuarios queda lista para conectar al backend, pero la matriz
de permisos y las acciones de editar/reactivar requieren endpoints y reglas de
negocio definitivos.
