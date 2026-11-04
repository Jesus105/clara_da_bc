# 📋 TaskNest: Marco Metodológico, Comprensión del Caso y Supuestos Analíticos

**Documento de Trabajo — Fase 1: Alineación Teórica y Supuestos de Negocio**  
**Audiencia:** Asesoría analítica para el Chief Product Officer (CPO)  
**Preparado por:** Data Analytics Team  

---

## 1. Contexto de Negocio y la Pregunta Central

### El Dilema del CPO
El equipo de producto lanzó **Guided Onboarding** el 1 de junio de 2026 esperando incrementar la activación de usuarios y la conversión de la prueba gratuita (*Free Trial*) a planes de pago. Sin embargo, el dashboard corporativo mostró una caída general en ambos indicadores en comparación con el periodo previo.

> **Pregunta Clave a Responder:**  
> *¿Debe TaskNest expandir (rollout 100%), modificar o detener (stop) Guided Onboarding?*

### El Síntoma del Dashboard (La Aparente Caída)
* **Activación general:** Cayó de **50.13%** (Abr-May) a **37.01%** (Jun-Jul).
* **Conversión general:** Cayó de **32.60%** (Abr-May) a **28.91%** (Jun-Jul).

La labor analítica consiste en desentrañar si esta caída se debió a una deficiencia intrínseca del nuevo onboarding o si se trata de un **espejismo estadístico** producto de eventos externos concurrentes.

---

## 2. Línea de Tiempo Integral de Eventos (Timeline)

```
Abril 1               Junio 1              Junio 20             Julio 31     Agosto 7
   │                     │                    │                    │            │
   ▼                     ▼                    ▼                    ▼            ▼
┌──────────────────┐  ┌────────────────────┐ ┌────────────────┐ ┌──────────┐ ┌───────────────┐
│ Período Pre      │  │ • Rollout Guided   │ │ • Android v3.2 │ │ Fin de   │ │ Extracción de │
│ (Baseline        │  │ • Creator Campaign │ │   (Cambio de   │ │ registros│ │ datos         │
│  Classic 100%)   │  │   (Influencers)    │ │   instrument.) │ │ (Trials) │ │ (Corte final) │
└──────────────────┘  └────────────────────┘ └────────────────┘ └──────────┘ └───────────────┘
```

1. **1 de abril de 2026 (Inicio del Baseline / Pre):** Comienzan los registros observados en el dataset bajo la experiencia 100% **Classic**.
2. **1 de junio de 2026 (Día D — Dos eventos simultáneos):**
   * **Evento A (Producto):** Despliegue parcial de **Guided Onboarding** a nuevos usuarios sin mecanismo de aleatorización pura.
   * **Evento B (Marketing):** Lanzamiento de la **Creator Campaign** (campaña de creadores de contenido e influencers), que inunda la plataforma con tráfico de volumen masivo pero baja intención de compra.
3. **20 de junio de 2026 (Evento C — Ruptura de Datos):**
   * Despliegue de la versión **3.2 de la app de Android**, la cual cambia la instrumentación/registro técnico del evento `task_created`, rompiendo el conteo de la métrica de activación en esta plataforma.
4. **31 de julio de 2026 (Cierre de Adquisición):** Último día de registros de prueba incluidos en `trial_users.xlsx`.
5. **7 de agosto de 2026 (Fecha de Extracción / Corte Final):** Corte temporal de los logs de producto en `product_events.xlsx`.

---

## 3. Reglas de Negocio Oficiales y Ventanas de Atribución

Las métricas oficiales operan bajo un **reloj relativo individual** para cada usuario, medido a partir de su momento exacto de registro (`signup_at = Día 0`):

```
Día 0 (signup_at) ────────────► Día 7 ────────────────────────► Día 14
      │                           │                                │
      └────── VENTANA DE 7 DÍAS ──┘                                │
             ¿Se ACTIVÓ?                                           │
             (≥ 1 proyecto y ≥ 3 tareas)                           │
                                                                   │
      └───────────────────── VENTANA DE 14 DÍAS ───────────────────┘
                            ¿CONVIRTIÓ A PAGO?
                            (Trial de 14 días completado y pagado)
```

| Métrica | Definición Oficial del Brief | Ventana de Medición Relativa | Objetivo de Negocio |
| :--- | :--- | :---: | :--- |
| **Duración del Trial** | Prueba gratuita estándar de **14 días** (100% de usuarios). | $[0, 14]$ días | Período de evaluación del producto. |
| **Activación** | Al menos **1 evento `project_created`** Y al menos **3 eventos `task_created`**. | $[0, 7]$ días desde `signup_at` | Mide el enganche inicial temprano (*Aha! Moment*). |
| **Conversión de Prueba** | Registro de pago (`converted_at` no nulo) dentro de la vigencia del trial. | $[0, 14]$ días desde `signup_at` | Mide la monetización directa del Free Trial. |

---

## 4. Supuestos Críticos y Hallazgos Metodológicos

### Supuesto 1: Madurez de Cohortes y Censura por la Derecha (*Right-Censoring*)
* **Para Activación (7 días):** La información está **100% madura**. El último usuario se registró el 31 de julio y la data se cortó el 7 de agosto ($31\text{ jul} + 7\text{ días} = 7\text{ ago}$).
* **Para Conversión (14 días):** Existe **inmadurez en las últimas cohortes**. Los usuarios registrados entre el **25 y el 31 de julio (122 usuarios)** no alcanzaron a cumplir sus 14 días completos antes del corte del 7 de agosto.
* **Impacto en el análisis:** Como el 25% de las conversiones suele ocurrir entre el día 8 y 14, la tasa de conversión observada en la última semana de julio es conservadora y tenderá a subir naturalmente. Al aislar solo cohortes maduras (1 de junio al 24 de julio), Guided supera a Classic por **+8.7 puntos porcentuales** (32.4% vs 23.7%).

### Supuesto 2: Tratamiento del Límite de 14 Días y Período de Gracia
* En la data existen **3 usuarios** (1 Pre, 2 Post) que registraron su pago entre **14.07 y 14.26 días** (apenas de 2 a 6 horas después de los 14 días exactos, atribuible a reintentos de pago o zonas horarias).
* **Tratamiento metodológico:**
  * **Criterio Estricto (Oficial):** Excluirlos (`converted_14d = False`) respetando textualmente el brief. (Guided Post: **31.72%** vs Classic Post: **24.57%** ➔ $+7.15\text{ pp}$, $p = 0.0165$).
  * **Criterio Pragmático (*Grace Period*):** Incluirlos (`converted_at.notnull()`). (Guided Post: **32.05%** vs Classic Post: **24.57%** ➔ $+7.48\text{ pp}$).
* **Conclusión:** Ambos criterios son consistentes; Guided Onboarding es estadísticamente superior en ambos casos.

### Supuesto 3: La Paradoja de Simpson y la Creator Campaign (Mix Shift)
* **Cambio de Mezcla:** El tráfico de `Creator Campaign` pasó de representar el **3.7%** (Pre) al **34.1%** (Post) de todos los registros de la empresa.
* **Intención del Canal:** Es un canal con conversión natural baja (~13%) comparado con `Organic` (34.6%) o `Referral` (47.4%).
* **El Espejismo:** La inyección masiva de usuarios de baja conversión hundió el promedio global de la compañía, a pesar de que **Guided Onboarding venció a Classic en todos y cada uno de los canales** (en la misma Creator Campaign, Guided convirtió al 15.4% vs 8.6% de Classic).

### Supuesto 4: Falso Desplome de Activación por Bug en Android 3.2
* La actualización de Android 3.2 el 20 de junio redujo el registro de eventos `task_created` en un 67%, haciendo que la activación en Android cayera de 47% a 8%.
* **Grupo de Control Forense:** En iOS y Web (plataformas no afectadas por el cambio de instrumentación), la activación se mantuvo sana y Guided superó a Classic consistentemente.
* Al remover los datos corruptos de Android 3.2, la activación real en el periodo Post sube de 37.0% a **47.4%** (Guided alcanza **51.0%** vs Classic **41.8%**, $+9.14\text{ pp}$, $p = 0.0175$).

### Supuesto 5: Sesgo de Asignación (Falta de A/B Testing Aleatorizado)
* El brief indica que el rollout no fue aleatorizado formalmente.
* La distribución real evidencia desbalances entre plataformas (ej. en iOS el ~75% de los usuarios recibió Guided, mientras que en Web fue menos del 45%).
* **Acción analítica:** Es imperativo controlar por plataforma y canal para evitar sesgos de selección, y recomendar al CPO la adopción de una plataforma formal de experimentación aleatorizada.

### Supuesto 6: Dimensión Financiera y Precios (RPTS)
* No basta con analizar el porcentaje de conversión; debe medirse el **Revenue Per Trial Signup (RPTS)** evaluando los tres puntos de precio ofrecidos ($12, $15 y $18 USD).
* Guided Onboarding eleva el RPTS de **$3.61 a $4.73 USD (+31%)**, maximizando ingresos en todos los niveles tarifarios.

---

## 5. Próximos Pasos (Next Steps)

```
┌────────────────────────────────────────────────────────────────────────┐
│                      HOJA DE RUTA DE EJECUCIÓN                         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│   PASO 1     │             │    PASO 2    │             │    PASO 3    │
│ Validación   │ ──────────► │ Storytelling │ ──────────► │ Entregables  │
│ Estadística  │             │ Visual y     │             │ Finales para │
│ en Python    │             │ Gráficas     │             │ el CPO       │
└──────────────┘             └──────────────┘             └──────────────┘
```

1. **Paso 1: Validación Estadística Completa (Python):**
   * Confirmar significancia estadística mediante pruebas de hipótesis (Chi-cuadrado para tasas de conversión y t-test / Mann-Whitney para RPTS).
   * Generar la tabla contrafactual: ¿Cuál habría sido la conversión global si no hubiera existido el cambio de mezcla de marketing?

2. **Paso 2: Storytelling Visual (Estructura de Slides):**
   * Crear el esquema diapositiva por diapositiva:
     * *Slide 1:* Diagnóstico ejecutivo y recomendación central (BLUF: Expandir al 100%).
     * *Slide 2:* Deconstrucción del confounder de marketing (Simpson's Paradox).
     * *Slide 3:* Deconstrucción del confounder técnico (Bug de instrumentación Android 3.2).
     * *Slide 4:* Impacto real en negocio (Conversión concurrente y RPTS por nivel de precio).
     * *Slide 5:* Hoja de ruta estratégica (Plan 30-60-90 días y mejoras de gobernanza de datos).

3. **Paso 3: Redacción de Materiales de Entrega:**
   * Borrador del **Email Ejecutivo de Envío** dirigido al CPO.
   * **Nota de Uso de Inteligencia Artificial (AI-Use Note)** con la metodología de validación humana y reproducibilidad técnica exigida en el brief.
