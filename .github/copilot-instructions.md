# Instrucciones para Copilot — NPD Resource Planner (Frontend)

## Contexto
SPA interna de Infosgroup que reemplaza el Excel "Resource Planner" de Operaciones. Gestiona recursos NPD y sus asignaciones a clientes (≈160 recursos, 16 clientes). La UI está en **español**.

## Stack (versiones fijas, no cambiar sin decisión nueva)
- React 19.3.0 + TypeScript (strict)
- Despliegue: Vercel
- Auth: Keycloak, OIDC + PKCE. El API valida el JWT; el front solo guarda el token en memoria.
- API: REST (Spring Boot). Los contratos se tipan en `src/api/types.ts` y reflejan los DTOs del backend.

## Reglas de trabajo
- **Máximo 1000 líneas por commit.** Si una tarea se acerca a ese límite, propón cómo dividirla antes de seguir.
- Un commit = una unidad funcional (tokens, layout, login, recursos, etc.).
- No instalar Tailwind. Estilos con **CSS variables** (`src/styles/tokens.css`) + CSS Modules.
- Nunca escribir colores, radios o tamaños "a mano": usar siempre los tokens.
- Componentes funcionales, hooks, sin `any`. Props tipadas con `interface`.
- Textos de UI en español; código, nombres y commits en inglés (Conventional Commits: `feat:`, `fix:`, `chore:`).

## Estructura de carpetas
```
src/
  api/          cliente HTTP, types.ts (DTOs)
  auth/         Keycloak, AuthProvider, useSession, RequireRole
  components/   ui/ (Button, Chip, Field, NavItem, Paginator, Icon) y layout/ (TopBar, OpsBar)
  features/     resources/ history/ dashboard/ vacations/ users/ notifications/
  routes/
  styles/       tokens.css, global.css
```
Cada feature agrupa sus componentes, hooks y llamadas al API. Una feature no importa de otra: lo compartido va en `components/` o `api/`.

## Roles y permisos
Roles: Operaciones, Gerencia, NPD Lead, Customer Success, Ventas, RR. HH. (por confirmar), Capacitación (por confirmar), Administrador.
- El menú muestra solo las pantallas permitidas para el rol del JWT.
- Acceso por modo: **completo**, **solo ver** o **ver + registrar**. Los botones de edición se ocultan en modo solo ver.
- Si la ruta no está permitida, mostrar la pantalla "No tienes acceso a esta pantalla".
- El front nunca decide la seguridad: el API es la autoridad. Los permisos del front son solo UX.
- Los campos sensibles (Talent Review, incidentes) pueden venir ocultos desde el API; manejar su ausencia.

## Pantallas (nodo Figma → módulo)
Archivo Figma `N1rv0xAbvo7MifZXdo7Dk6`, página "NPD · Fundamentos".
- Login · Recursos (Gantt + tabla + drawer) · Editar/Registrar recurso · Historial del colaborador · Tablero (Recursos / Reporte mensual) · Vacaciones · Usuarios · Avisos · Infosweb ("En desarrollo", probablemente fuera de alcance) · Sin acceso.

## Comportamientos globales
- Barra inferior (Ops bar): última actualización, recursos activos, clientes, próximo envío de avisos, **contador de expiración de sesión**.
- Modal "Tu sesión está por expirar" antes de que venza el token; refrescar token con Keycloak.
- Paginación del servidor (25 por página).
- Estados vacíos y de error en cada listado.

## Accesibilidad
Contraste AA, foco visible, `aria-current` en el ítem activo del menú, inputs con `label` asociado y `aria-describedby` para errores. Texto blanco pequeño sobre `--brand-orange` no cumple AA: usar `--brand-orange-deep` en botones y texto grande/negrita en la barra superior.
