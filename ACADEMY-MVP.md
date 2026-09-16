# Local Reset Academy · MVP

## Alcance de esta fase

- Landing pública en `/academy`.
- Campus visual de ejemplo dentro de la landing.
- Sin autenticación, pagos, automatizaciones ni datos de alumno.
- La web principal y la aplicación Viralia quedan intactas.

## Lectura del proyecto actual

La landing de Jonathan Castilla es una web estática en la raíz. El repositorio también contiene `viralia/`, una aplicación Next.js con su propia configuración y uso de Supabase. Academy debe vivir como módulo independiente, sin acoplarse a Viralia.

## Rutas siguientes

| Ruta | Finalidad | Estado MVP |
| --- | --- | --- |
| `/academy` | Landing, programa y reserva | Implementada |
| `/academy/dashboard` | Inicio privado: continuar, novedades y progreso | Maqueta siguiente fase |
| `/academy/cursos` | Curso presencial y módulos | Siguiente fase |
| `/academy/tutoriales` | Biblioteca de soluciones prácticas | Siguiente fase |
| `/academy/prompts` | Prompt Library con copia de prompt | Siguiente fase |
| `/academy/recursos` | Checklists, plantillas y guías | Siguiente fase |
| `/academy/novedades` | Contenido añadido durante el mes | Siguiente fase |
| `/academy/cuenta` | Acceso, plan y fecha de acceso | Siguiente fase |

## Flujo del alumno

1. Descubre `/academy` y solicita plaza.
2. Hace la formación presencial en Local Reset Studios.
3. Recibe acceso de seis meses al Campus.
4. Entra al dashboard y continúa el curso o busca una solución concreta.
5. Consulta tutoriales, prompts, recursos y novedades.
6. Al vencer el acceso, puede pasar al plan Campus.

## Modelo de datos propuesto

| Entidad | Campos esenciales |
| --- | --- |
| `profiles` | `id`, `name`, `role`, `created_at` |
| `products` | `id`, `slug`, `name`, `kind`, `price_cents`, `active` |
| `cohorts` | `id`, `product_id`, `starts_at`, `capacity`, `location` |
| `enrollments` | `id`, `user_id`, `product_id`, `cohort_id`, `access_until`, `status` |
| `courses` | `id`, `slug`, `title`, `description`, `published` |
| `modules` | `id`, `course_id`, `position`, `title` |
| `lessons` | `id`, `module_id`, `title`, `duration_minutes`, `video_url`, `published_at` |
| `progress` | `user_id`, `lesson_id`, `completed_at`, `last_position_seconds` |
| `prompts` | `id`, `category`, `title`, `body`, `tools`, `updated_at`, `published` |
| `resources` | `id`, `category`, `title`, `file_url`, `published_at` |
| `content_updates` | `id`, `kind`, `entity_id`, `published_at` |

## Acceso y permisos futuros

- **Admin:** gestiona contenido, cohortes, precios y accesos.
- **Alumno presencial:** Campus incluido hasta `access_until`.
- **Miembro Campus:** acceso mientras la membresía esté activa.
- **Usuario sin suscripción:** solo landing pública y contenido abierto.

Cuando se implemente Supabase, cada tabla expuesta deberá tener RLS. El cliente solo podrá leer contenido publicado y sus propios datos de progreso y acceso; las operaciones administrativas se harán desde servidor.

## Componentes a reutilizar

- Navegación oscura y tipografía de la landing de Jonathan Castilla.
- Estructura de bloques editoriales a pantalla completa.
- Paneles visuales de señal, cámara y audio.
- `details/summary` para el programa y las preguntas frecuentes, sin JavaScript adicional.

