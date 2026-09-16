# Local Reset Academy · plataforma con Free y Premium

## Resultado de la auditoría

| Área | Estado actual | Reutilización |
| --- | --- | --- |
| `jc.com` | Landing estática HTML/CSS | Identidad, contenido público y diseño |
| Vocolia | Next.js 16, Supabase SSR y Stripe | Patrones de servidor, Auth, Checkout, Customer Portal y webhook |
| Supabase | Ya existe para Vocolia | No compartir tablas operativas ni planes de Vocolia |

Academy debe ser un módulo Next.js propio. El HTML estático de `jc.com` no puede proteger rutas, validar permisos o recibir webhooks de Stripe. Vocolia sí aporta patrones útiles, pero no es el lugar donde alojar Academy: sus tablas y lógica de créditos pertenecen a otro producto.

## Decisión técnica recomendada

Crear una aplicación Next.js de Academy, con su propio proyecto Vercel y el mismo proyecto Supabase solo si se confirma que ambos productos deben compartir usuarios. Si deben permanecer independientes, usar un proyecto Supabase nuevo.

Para conservar la ruta solicitada `/academy`, hay dos caminos:

1. Migrar `jc.com` a Next.js e integrar Academy como grupo de rutas. Es la opción correcta si Academy será parte central de la web.
2. Desplegar Academy como aplicación Next separada y usar `academy.localreset.com`. Es más segura para no cambiar la landing actual, pero cambia la URL pública.

No se debe intentar resolverlo con HTML estático ni reescrituras improvisadas.

## Configuración central

```ts
export const academyConfig = {
  brandName: "Local Reset Academy",
  routes: { home: "/academy", dashboard: "/academy/dashboard" },
  prices: {
    monthlyPriceId: process.env.STRIPE_ACADEMY_MONTHLY_PRICE_ID,
    annualPriceId: process.env.STRIPE_ACADEMY_ANNUAL_PRICE_ID,
  },
};
```

El nombre comercial y los IDs de Stripe salen de una única configuración. Los importes visibles vendrán de Stripe o de una configuración de planes, no de componentes dispersos.

## Tablas propuestas

| Tabla | Finalidad |
| --- | --- |
| `academy_profiles` | Perfil, rol y preferencias de onboarding |
| `academy_plans` | Planes configurables y relación con IDs de Stripe |
| `academy_entitlements` | Acceso efectivo: free, premium, alumno o admin, con fecha de expiración |
| `academy_subscriptions` | Estado sincronizado desde Stripe y customer ID |
| `academy_categories` | Organización de la biblioteca |
| `academy_content` | Tutoriales, entrevistas, masterclasses, casos y novedades |
| `academy_prompts` | Prompt Library, herramientas y fecha de actualización |
| `academy_resources` | Plantillas, checklists y archivos descargables |
| `academy_progress` | Posición y completado de lecciones |
| `academy_favorites` | Guardados del usuario |
| `academy_professionals` | Fichas de invitados y especialidades |
| `academy_questions` | Pregunta del mes y revisión editorial |
| `academy_challenges` | Reto del mes y sus entregas opcionales |
| `academy_stripe_events` | Idempotencia: ID de evento Stripe ya procesado |

`academy_content.access_level` será `public`, `free` o `premium`. La autorización se validará desde servidor y con RLS: la portada puede ser visible, pero la URL de vídeo, el prompt completo o la descarga no se entregarán si el entitlement no lo permite.

## Pagos y acceso

1. Registro por email y contraseña con Supabase Auth.
2. Perfil Free y preferencias opcionales.
3. Checkout de Stripe creado solo en servidor para mensual o anual.
4. Webhook con cuerpo crudo y firma verificada.
5. Registro idempotente del evento y actualización de `academy_subscriptions` + `academy_entitlements`.
6. Customer Portal desde Cuenta.
7. El acceso no cambia por la URL de éxito; solo lo cambia el webhook confirmado.

Para los alumnos presenciales, administración creará un entitlement Premium con una fecha de finalización de seis meses. Esa vía no depende de Stripe.

## Rutas de la primera implementación

- Públicas: `/academy`, `/academy/registro`, `/academy/login`, `/academy/recuperar-password`, `/academy/premium`, `/academy/presencial`.
- Privadas: `/academy/dashboard`, `/academy/tutoriales`, `/academy/prompts`, `/academy/recursos`, `/academy/novedades`, `/academy/favoritos`, `/academy/cuenta`.
- Editoriales: `/academy/profesionales`, `/academy/casos`, `/academy/masterclasses`.
- Servidor: `/api/academy/checkout`, `/api/academy/portal`, `/api/academy/stripe-webhook`.

## Orden seguro de desarrollo

1. Decidir el alojamiento y la relación de usuarios con Vocolia.
2. Crear la app y configuración central.
3. Añadir las migraciones Academy y RLS; revisar con los advisors de Supabase.
4. Registro, login, callback y onboarding Free.
5. Biblioteca demo con accesos public/free/premium aplicados en servidor.
6. Stripe en modo test: producto y precios solo tras comprobar que no existen duplicados.
7. Checkout, webhook idempotente, entitlements y Customer Portal.
8. Pruebas de visitante, Free, Premium, cancelación y renovación.

