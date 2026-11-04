# 👋 Léeme primero (no necesitas saber programar)

Este paquete es la resolución del caso de **Data Analyst de TaskNest**.

## La respuesta en una frase

> **Hay que expandir el Onboarding Guiado al 90 % de los usuarios nuevos y dejar un 10 % con el onboarding clásico como grupo de control.**
> El dashboard de la empresa asusta, pero la caída de los KPIs **no la causa Guided**: se explica por (1) una campaña con creadores que trajo usuarios con menos intención de compra y (2) un error de medición en Android 3.2 que dejó de registrar tareas.

## Qué abrir, en orden

| # | Qué | Archivo | Para qué sirve | Tiempo |
|---|---|---|---|---|
| 1 | 📊 **Deck de análisis** | `entregables/TaskNest_Analysis_Deck_EN.pdf` | 8 slides con la historia completa y la recomendación (inglés) | 5 min |
| 2 | 📗 **Análisis en Excel** | `entregables/TaskNest_CVR_Analysis.xlsx` | Todos los números, con fórmulas que se pueden auditar. Empieza por la pestaña **README** y luego **Conclusions** | 15 min |
| 3 | 📝 **Reporte completo** | `entregables/ANALISIS_COMPLETO_TASKNEST.pdf` | La explicación detallada en español | 15 min |
| 4 | 🤖 **Deck de uso de IA** | `entregables/TaskNest_AI_Use_Deck_EN.pdf` | Cómo se usó IA para construir el análisis (inglés) | 3 min |
| 5 | 🌐 **Dashboard interactivo** | https://tasknest-business-case.vercel.app | Filtros por canal, plataforma y versión; no requiere instalar nada | 5 min |

## Cómo se leen las pestañas del Excel

| Pestaña | Qué responde |
|---|---|
| Conclusions | La respuesta al CPO con la evidencia |
| 1 Data Quality | ¿Podemos confiar en los datos? |
| 2 Dashboard vs Reality | ¿Por qué el dashboard de la empresa engaña? |
| 3 Channel Mix | ¿Cuánto de la caída de conversión es cambio de mezcla de canales? |
| 4 Guided vs Classic | ¿Guided funciona? Comparación justa, en las mismas semanas |
| 5 Android 3.2 | El error de medición que hizo parecer que cayó la activación |
| 6 Users | Qué hace que un usuario pague (momento "aha", precio, tiempo a pagar) |
| 7 Weekly Timeline | Evolución semana a semana |

Las demás pestañas (`params`, `user_facts`, `events_prep`, `raw_*`) son el "motor": datos y cálculos de apoyo. No hace falta tocarlas.

## Glosario rápido

| Término | Significado |
|---|---|
| **Trial** | Prueba gratis de 14 días |
| **Conversión (CVR)** | % de usuarios en trial que pagan dentro de los 14 días |
| **Activación** | El usuario crea ≥1 proyecto y ≥3 tareas en sus primeros 7 días |
| **Guided / Classic** | Onboarding guiado (nuevo) / onboarding tradicional |
| **Creator Campaign** | Campaña con creadores de contenido que arrancó el 1-jun |
| **Mix** | Cambio en la proporción de usuarios por canal. Puede mover el KPI total sin que el producto cambie |
| **pp** | Puntos porcentuales: la diferencia entre dos porcentajes |
| **Holdout** | Grupo pequeño que se deja sin el cambio para medir su efecto de verdad |

## ¿Quieres usar la IA para hacer preguntas sobre los datos?

Hay una **skill** (un "analista experto" para Claude) que responde preguntas sobre TaskNest con datos reales. Guía paso a paso: **`docs/COMO_USAR_LA_SKILL.pdf`**. Si eres técnico, empieza por `README.pdf`.
