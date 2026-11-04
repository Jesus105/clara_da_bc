# TASKNEST | CASO PARA DATA ANALYST

*Material de caso ficticio y sintético · Página 1*

## Caso de negocio para Data Analyst

Rollout de onboarding guiado | Brief de candidato, Opción B

> El CPO debe decidir si expandir, modificar o detener el Onboarding Guiado. Asesore esa decisión usando la evidencia disponible.

### Contexto de negocio

**TaskNest** es una aplicación ficticia de productividad con una prueba gratuita de 14 días. El 1 de junio de 2026, el equipo de producto comenzó a mostrar una nueva experiencia de **Onboarding Guiado** a una parte de los usuarios nuevos. La experiencia original se denomina **Classic**.

El Onboarding Guiado ayuda a los usuarios a crear su primer proyecto y sus primeras tareas. El equipo de producto esperaba que mejorara la activación durante la prueba y la conversión a pago. Sin embargo, desde el lanzamiento, el dashboard general de la compañía muestra una activación y una conversión más bajas que en el periodo anterior.

Durante la ventana de observación ocurrieron otros dos cambios: una **Creator Campaign** comenzó el 1 de junio, y la versión **3.2** de la app para Android cambió la instrumentación de la creación de tareas el 20 de junio. No se creó un experimento aleatorizado para el rollout del onboarding.

### Su encargo

Revise los materiales del caso y prepare el entregable que usaría para asesorar al CPO. Usted tiene autonomía para decidir qué preguntas importan, cómo estructurar el análisis y qué formato respalda mejor la decisión.

Su entrega debe poder ser revisada por otro analista. Presentará la recomendación central en una entrevista de seguimiento y podría pedírsele que la revise después de recibir información adicional.

### Uso de IA

**El uso de IA está permitido y se espera.** Use herramientas de IA como lo haría en su flujo de trabajo profesional normal. Usted sigue siendo responsable de cada número, supuesto, afirmación y recomendación.

Incluya una nota breve, en el formato que considere adecuado, que explique cómo influyó la IA en el trabajo y cómo validó el resultado final. No se requieren las transcripciones completas de los prompts.

### Definiciones del dashboard interno

- **Activación:** al menos un evento `project_created` y al menos tres eventos `task_created` durante los primeros siete días después del registro.
- **Conversión de prueba:** una conversión a pago registrada dentro de los 14 días posteriores al registro.

---

*Material de caso ficticio y sintético · Página 2*

## Datos disponibles

Dos archivos fuente | Datos extraídos hasta el 7 de agosto de 2026

### trial_users.xlsx

| Campo | Descripción |
|---|---|
| `user_id` | Usuario de prueba único. |
| `signup_at` | Marca de tiempo del registro en la prueba. Los registros llegan hasta el 31 de julio. |
| `acquisition_channel` | Canal de registro registrado. |
| `platform` | iOS, Android o Web. |
| `onboarding_experience` | Classic o Guided. |
| `app_version` | Versión en el momento del registro. |
| `trial_length_days` | Duración de la prueba. |
| `monthly_price_usd` | Precio mensual ofrecido en USD. |
| `converted_at` | Marca de tiempo de la conversión a pago registrada; en blanco si no hay conversión registrada. |

### product_events.xlsx

| Campo | Descripción |
|---|---|
| `event_id` | Evento de producto único. |
| `user_id` | Usuario asociado al evento. |
| `event_at` | Marca de tiempo del evento. |
| `event_name` | Acción de producto registrada. |
| `app_version` | Versión de la app asociada al evento. |

### Entrega y discusión

Envíe por correo el material que se presentará, el entregable orientado a la decisión y la nota sobre el uso de IA. Además, incluya un resumen breve de sus principales conclusiones y recomendaciones.
