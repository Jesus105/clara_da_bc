# TaskNest · Onboarding Guiado: qué está pasando de verdad y qué hacer

**Para:** CPO · **Preparado por:** Data Analytics · **Datos:** 1,800 trials (1-abr → 31-jul-2026), 10,220 eventos, extracción 7-ago-2026
**Fuente:** PostgreSQL `tasknest` (tablas `trial_users`, `product_events`). Todos los números se recalcularon desde las tablas raw con SQL.

---

## 0. La respuesta en 30 segundos (BLUF)

> **Recomendación: EXPANDIR el Onboarding Guiado, dejando un 10 % de los usuarios nuevos con Classic como grupo de control.** El dashboard no muestra un problema del producto: muestra un **cambio de mezcla de usuarios** (Creator Campaign) y un **error de medición** (Android 3.2).

| Lo que dice el dashboard | Lo que pasa realmente |
|---|---|
| La conversión cayó de 32.6 % a 28.9 % (−3.7 pp) | **Toda** la caída es mix de canal (−7.5 pp). Dentro de cada canal, la conversión **subió** (+3.8 pp) |
| La activación cayó de 50.1 % a 37.0 % | Android 3.2 dejó de registrar tareas. Sin esa versión, Guided activa **51.0 % vs 41.8 %** de Classic |
| "Guided no funciona" | Guided convierte **31.7 % vs 24.6 %** de Classic en las mismas semanas (+7.2 pp, IC 95 % [+1.6, +12.7]) y deja **+$1.12 por trial (+31 %)** |

**Tres pasos más allá, sobre nuestros usuarios:**
1. **El "momento aha" es crear 3 tareas.** Con 0–2 tareas convierte ~17 %; con 3 o más, ~41 %. Crear solo un proyecto no mueve nada.
2. **El precio casi no afecta la conversión** (elasticidad −0.14). **$18 deja +15 % de ingreso por trial que $15 y +42 % que $12.** Bajar el precio no compra conversión.
3. **La decisión de pago se toma pronto:** el 74 % paga en los primeros 7 días (mediana: 4.8 días). Lo que pase en las primeras 72 h define el negocio.
4. **El problema de la Creator Campaign es la intención de compra, no el producto:** incluso cuando se activan, estos usuarios convierten 25 %, contra 35–56 % de los otros canales.

---

## 1. El problema

El 1 de junio se lanzó el Onboarding Guiado a una parte de los usuarios nuevos, sin aleatorización. Ese mismo día arrancó la Creator Campaign, y el 20 de junio Android 3.2 cambió cómo se registra `task_created`. El dashboard compara abril-mayo contra junio-julio y muestra caídas en ambos KPIs.

**La pregunta real no es "¿bajaron los KPIs?" sino "¿cuánto de la caída se debe a Guided y cuánto a los otros dos eventos?"**. Para separarlos usamos tres herramientas:
1. **Comparación en las mismas semanas** (Guided vs Classic, ambos en junio-julio).
2. **Descomposición tasa / mix** de la conversión por canal.
3. **Aislar la plataforma afectada** por el cambio de instrumentación.

---

## 2. Capítulo 1 · Qué datos podemos creer (calidad de datos)

Antes de concluir nada, auditamos la data. Encontramos cuatro trampas:

| # | Trampa | Evidencia | Tratamiento |
|---|---|---|---|
| 1 | **Android 3.2 deja de registrar tareas** | Tareas promedio por usuario: 2.81 → 0.94. Usuarios con ≥3 tareas: 51 % → 8 %. El % con proyecto **no cambia** (63 % → 61 %). Solo el 7 % de quienes pagaron aparece "activado" (vs 67 % en 3.1) | Activación de Android 3.2 marcada como no confiable. La conversión de esa versión sí sirve, porque no depende de eventos |
| 2 | **Desfase de reloj entre sistemas** | 1,928 eventos con fecha *anterior* al signup (hasta −14.9 h, rango de husos horarios) | Ver hallazgo abajo: la regla estricta subestima la activación |
| 3 | **Cohortes recientes sin 14 días completos** | 155 usuarios Post registrados después del 24-jul no alcanzaron 14 días antes del corte | Sensibilidad usando solo cohortes completas (el resultado se mantiene y hasta mejora) |
| 4 | **Pagos justo después del día 14** | 3 de 552 pagos caen entre 14.07 y 14.26 días (el cobro corre cada hora) | Se usa la regla oficial (≤14 días). Incluirlos no cambia nada |

### 🔎 Hallazgo de calidad: la regla de activación sesga contra quien se registra en la noche

La vista oficial solo cuenta eventos con `event_at >= signup_at`. Al revisar la activación por hora del signup:

| Hora del signup | Activación (regla estricta) | Activación (tolerancia −15 h) | Proyectos con fecha "antes" del signup |
|---|---|---|---|
| 06–11 h | 53.4 % | 53.4 % | 1 |
| 12–17 h | 50.4 % | 54.8 % | 24 |
| 18–23 h | **42.1 %** | **55.2 %** | **63** |

La aparente "menor activación nocturna" es **100 % artefacto**: a quienes se registran de noche se les estampan eventos con hora previa al signup y la regla los descarta. **Corrigiendo, la activación real es pareja (~54 %) a cualquier hora.** Recomendación técnica: normalizar todo a UTC y, mientras tanto, usar una tolerancia de −15 h. El lift de Guided casi no cambia con una u otra regla (+7.4 pp estricta vs +7.6 pp tolerante), así que **la recomendación no depende de esta decisión**.

---

## 3. Capítulo 2 · La caída de conversión es mix, no producto

La Creator Campaign pasó de **3.7 % a 34.1 %** de los signups, y es el canal que menos convierte.

**Descomposición tasa / mix de la conversión Pre → Post, por canal** (método Paasche + mix centrado en el periodo Pre):

| Canal | Conv. Pre → Post | Peso Pre → Post | Distancia vs promedio Pre | Efecto tasa | Efecto mix | Total |
|---|---|---|---|---|---|---|
| Creator Campaign | 10.3 → 13.2 % | 3.7 → 34.1 % | −22.3 pp | +0.97 | **−6.75** | **−5.79** |
| Referral | 45.4 → 50.0 % | 25.3 → 14.5 % | +12.8 pp | +0.66 | −1.38 | −0.72 |
| Organic | 32.7 → 36.7 % | 40.6 → 29.3 % | +0.1 pp | +1.16 | −0.01 | +1.15 |
| Paid Search | 24.6 → 29.1 % | 30.4 → 22.2 % | −8.0 pp | +1.00 | +0.66 | +1.66 |
| **Total** | **32.6 → 28.9 %** | | | **+3.79** | **−7.49** | **−3.70 ✅** |

**Lectura:**
- **Los cuatro canales mejoraron su conversión.** La tasa aporta +3.8 pp.
- La entrada masiva de un canal de baja conversión resta −7.5 pp por mix. Es una paradoja de Simpson de libro.
- El cierre cuadra exacto: −3.70 pp = 28.9 % − 32.6 % ✅.

**Contrafactuales:**

| Escenario | Conversión |
|---|---|
| Post observado (dashboard) | 28.9 % |
| Post con el mix de canales de abril-mayo | **36.8 %** |
| Classic Post con el mix de abril-mayo | 31.9 % (vs 32.6 % real Pre → Classic no empeoró) |
| 100 % Guided con el mix de abril-mayo | **40.3 %** |

---

## 4. Capítulo 3 · Guided funciona (y no es suerte)

### 4.1 Comparación en las mismas semanas (junio-julio)

| Métrica | Classic | Guided | Lift | IC 95 % | z |
|---|---|---|---|---|---|
| Conversión a 14 días | 24.6 % (n=403) | 31.7 % (n=621) | **+7.2 pp** | [+1.6, +12.7] | 2.47 |
| Conversión, solo cohortes completas | 23.6 % (n=339) | 32.3 % (n=530) | **+8.7 pp** | [+2.6, +14.7] | 2.75 |
| Activación (oficial) | 32.5 % | 39.9 % | +7.4 pp | [+1.5, +13.4] | 2.41 |
| Activación sin Android 3.2 | 41.8 % (n=294) | 51.0 % (n=459) | **+9.1 pp** | [+1.9, +16.4] | 2.45 |
| Ingreso por trial (1er mes) | $3.61 | $4.73 | **+$1.12 (+31 %)** | | |

### 4.2 Tres pruebas de robustez (¿y si es sesgo de asignación?)

El rollout no fue aleatorio: iOS recibió 75 % Guided y Web 44 %. Revisamos si eso explica el resultado:

1. **Controlando por canal × plataforma** (12 combinaciones, ponderado por tamaño), el lift queda en **+6.9 pp**, casi igual a los +7.2 pp sin controlar. El desbalance no explica el efecto.
2. **Classic sirve como contrafactual.** Dentro de cada canal, Classic convierte igual antes y después del lanzamiento:

   | Canal | Classic Pre | Classic Post | Guided Post |
   |---|---|---|---|
   | Creator Campaign | 10.3 % | 9.4 % | **15.4 %** |
   | Organic | 32.7 % | 29.6 % | **41.7 %** |
   | Paid Search | 24.6 % | 26.3 % | **31.1 %** |
   | Referral | 45.4 % | 45.5 % | **52.7 %** |

   No hay una tendencia de fondo que "regale" el lift: Guided se despega de una línea base estable.
3. **Guided gana en todas las plataformas** (solo usuarios Post): iOS 34.3 vs 30.0 %, Web 31.0 vs 21.7 %, Android 3.1 21.0 vs 18.0 %, Android 3.2 33.3 vs 27.5 %.

**Honestidad metodológica:** en el cruce canal × plataforma, 3 de 12 combinaciones salen negativas (Referral-Web, Creator-iOS, Paid-Android), todas con menos de 60 usuarios por brazo. Es consistente con ruido, pero por eso decimos "consistente en casi todos los segmentos" y no "en el 100 %". Como no hubo aleatorización, esto es **evidencia observacional fuerte, no prueba causal**. De ahí la recomendación de mantener un grupo de control.

---

## 5. Capítulo 4 · Cómo funciona Guided (mecanismo)

**Funnel en los primeros 14 días** (Post, sin Android 3.2):

| Paso | Classic | Guided | Δ |
|---|---|---|---|
| Crea proyecto | 65.6 % | 71.7 % | +6.1 pp |
| Crea ≥1 tarea | 83.0 % | 85.0 % | +2.0 pp |
| **Crea ≥3 tareas** | 48.0 % | **57.1 %** | **+9.1 pp** |
| Configura recordatorio | 20.7 % | 24.0 % | +3.3 pp |
| Invita colaborador | 7.1 % | 10.9 % | +3.8 pp |
| **Paga** | 23.5 % | **31.2 %** | **+7.7 pp** |
| Mediana de horas al 1er proyecto | 14.9 h | 17.3 h | Guided no es más rápido |

**¿Guided convierte más solo porque activa más?** No del todo:

| | Classic | Guided | Δ |
|---|---|---|---|
| Conversión de **no activados** | 11.1 % | 16.8 % | +5.7 pp |
| Conversión de **activados** | 36.9 % | 42.0 % | +5.1 pp |

Separando los +7.7 pp de lift:
- **~2.3 pp (30 %)** vienen de que más usuarios llegan a activarse.
- **~5.4 pp (70 %)** vienen de que, activados o no, los usuarios Guided valoran más el producto.

Guided no solo empuja hacia el umbral: mejora la percepción de valor en general.

---

## 6. Capítulo 5 · Cómo son nuestros usuarios (los tres pasos extra)

### 6.1 El momento aha son 3 tareas, no el proyecto

Conversión según el número de tareas en 14 días (sin Android 3.2, n=1,529):

| Tareas | 0 | 1 | 2 | **3** | 4 | 5 | 6+ |
|---|---|---|---|---|---|---|---|
| Conversión | 17.7 % | 17.3 % | 16.7 % | **39.5 %** | 37.6 % | 44.2 % | 42.7 % |

- **Es un escalón, no una rampa.** De 2 a 3 tareas la conversión se multiplica por 2.4. Después de 3 se queda plana.
- **Crear un proyecto sin llegar a 3 tareas no vale nada:** 16.4 % de conversión, igual que quien no hace nada (17.6 %).
- **Recordatorio y colaborador no suman nada** una vez que el usuario está activado: activado solo 39.9 %, + recordatorio 43.4 %, + colaborador 41.7 %, + ambos 38.7 %. Su correlación "cruda" con el pago (42.6 % y 40.5 %) se explica completa por la activación.

> **Implicación de producto:** la métrica norte del onboarding debería ser **"% que llega a 3 tareas en 72 h"**. Que Guided 2.0 empuje a invitar colaboradores (como proponía la guía previa) **no tiene respaldo en la data**.

### 6.2 La decisión de pago se toma en la primera semana

| Días al pago | Pre Classic | Post Classic | Post Guided |
|---|---|---|---|
| Mediana | 4.8 d | 5.0 d | 4.7 d |
| % que paga en días 0–7 | 73.9 % | 72.7 % | 75.6 % |
| % que paga en días 8–14 | 26.1 % | 27.3 % | 24.4 % |

Distribución diaria (todas las conversiones): pico entre los días 2 y 5 (~12 % por día). Después del día 7 baja a 2–6 % por día, con un pequeño repunte el día 13 (3.5 %, cuando vence el trial).

**Implicaciones:**
- **Los empujones de conversión deben ir en los días 2–6**, no al final del trial.
- **Vale la pena probar un trial de 7 días:** solo el 26 % de los pagos llega después del día 7, y el repunte del día 13 sugiere que la fecha de vencimiento por sí misma motiva a pagar.
- Las cohortes de la última semana de julio subestiman la conversión en ~25 %. El dashboard debería mostrar solo cohortes maduras.

### 6.3 Canales: calidad muy distinta

| Canal | n | Conversión | Ingreso/trial | Activación (sin A3.2) | Conv. si **activado** | Conv. si **no activado** |
|---|---|---|---|---|---|---|
| **Referral** | 344 | **47.4 %** | **$6.99** | **66.0 %** | 55.9 % | 30.5 % |
| Organic | 615 | 34.6 % | $5.12 | 50.5 % | 43.9 % | 23.5 % |
| Paid Search | 463 | 26.8 % | $3.99 | 44.6 % | 35.4 % | 18.6 % |
| **Creator Campaign** | 378 | **13.0 %** | **$1.95** | 33.0 % | **25.3 %** | **5.7 %** |

- **Referral vale 3.6 veces más por trial que Creator.** Incluso un referido que no se activa (30.5 %) convierte más que un usuario Creator activado (25.3 %).
- **El problema de Creator es la intención de compra.** Aunque se activen, convierten a la mitad que el promedio. El producto puede ayudar (Guided sube su conversión de 9.6 a 13.9 %, +45 % relativo), pero no lo resuelve. **Hay que evaluar el CAC de la campaña**: con $1.95 por trial, solo es rentable si cada signup cuesta mucho menos que en los otros canales.
- **Dónde más ayuda Guided** (Post, sin A3.2): Organic +15.4 pp de conversión y +14.2 pp de activación. Referral, que ya es un canal de alta intención, es donde menos cambia (+8 pp de conversión, +4.9 pp de activación).
- **El mejor segmento es Referral × iOS:** 55 % de conversión y $8.00 por trial.

### 6.4 Plataformas

| Plataforma (Post) | n | % Guided | Conversión | Classic → Guided | Lift |
|---|---|---|---|---|---|
| iOS 4.1 | 355 | 75 % | 33.2 % | 30.0 → 34.3 % | +4.3 pp |
| Web | 256 | 44 % | 25.8 % | 21.7 → 31.0 % | **+9.3 pp** (el mayor) |
| Android 3.1 (1–19 jun) | 142 | 57 % | 19.7 % | 18.0 → 21.0 % | +3.0 pp |
| Android 3.2 (20 jun →) | 271 | 60 % | 31.0 % | 27.5 → 33.3 % | +5.8 pp |

Web es donde menos Guided se ha desplegado (44 %) y donde más rinde. **Es la prioridad para la expansión.**

### 6.5 Precio: ¿más barato convierte más? No.

**El precio funciona como un experimento natural.** La mezcla $12/$15/$18 es la misma (~25/55/20 %) en todos los meses, canales, plataformas y experiencias, lo que indica que se asignó de forma independiente al resto.

| Precio | n | Conversión | Ingreso por trial | vs $12 |
|---|---|---|---|---|
| $12 | 450 | 31.1 % | $3.73 | — |
| $15 | 986 | 30.6 % | $4.59 | +23 % |
| **$18** | 364 | **29.4 %** | **$5.29** | **+42 %** |

- **Elasticidad de arco $12→$18: −0.14.** Subir el precio 50 % baja la conversión solo 1.7 pp (IC 95 % [−4.6, +8.1], no significativo).
- **Se repite dentro de cada grupo:**
  - Pre Classic (sin ningún efecto de Guided): 32.5 / 33.3 / 30.8 %.
  - Post Guided: 30.3 / 32.8 / 30.5 %.
- **$18 maximiza el ingreso por trial en todas las plataformas** (iOS $6.15 vs $3.65 a $12) y en tres de cuatro canales.
- **Señales a vigilar (n chico, posible ruido):** Organic a $18 convierte 27.0 % vs 37.6 % a $15 (n=126), y Web baja de forma monótona (32.7 → 27.7 → 25.0 %, n=76 a $18). En esos dos segmentos, $15 podría ser el óptimo.
- **Combinación Guided + $18:** $5.50 por trial, contra $3.61 de Classic con la mezcla actual de precios (**+52 %**).

**Límite importante:** solo vemos el *primer pago*. No sabemos si a $18 la cancelación en los meses 2–3 es mayor. **La recomendación es una prueba de precio controlada ($15 vs $18) midiendo retención a 90 días**, no subir el precio sin más.

### 6.6 Cosas que parecen hallazgos pero no lo son

| "Hallazgo" | Por qué lo descartamos |
|---|---|
| Quien se registra de noche se activa menos (42 % vs 53 %) | **Artefacto del desfase de reloj** (sección 2). Corregido: ~54 % a cualquier hora |
| El jueves convierte más (36.8 %) | Siete comparaciones por día de la semana, ninguna hipótesis previa: es consistente con ruido |
| Invitar colaboradores sube la conversión (+11 pp) | Se explica completo por la activación (sección 6.1) |
| La conversión de Android subió con la 3.2 (29 → 31 %) | Dentro del ruido. La prueba del error de medición es el histograma de tareas cortado en 0–2 tareas |

---

## 7. Impacto en el negocio (orden de magnitud)

Con ~510 signups al mes (ritmo de junio-julio):

| Palanca | Supuesto | Impacto mensual por cohorte |
|---|---|---|
| Guided al 90 % (vs 60 % hoy) | +7.7 pp de conversión en el 30 % adicional | **+~12 clientes/mes, +~$170 MRR** |
| Guided 100 % vs 0 % (valor total del feature) | +7.7 pp | +~39 clientes/mes, +~$570 MRR |
| Precio $18 en vez de la mezcla actual | +$0.77 por trial (sobre Guided) | +~$390 MRR (*a validar con retención*) |
| Corregir el dashboard | Evita decisiones equivocadas (como apagar Guided) | No cuantificable, pero es el mayor riesgo evitado |

*Escala ficticia del caso. La lectura importante es la relativa: **+31 % de ingreso por trial con Guided, +15–17 % adicional con $18.***

---

## 8. Recomendaciones

### Decisión: EXPANDIR, con grupo de control

| Horizonte | Acción | Responsable | Métrica de éxito |
|---|---|---|---|
| **Semana 1** | Guided al **90 %** de usuarios nuevos en todas las plataformas, **10 % Classic asignado al azar** (hash de `user_id`) | Producto | Lift de conversión ≥ +4 pp sostenido |
| **Semana 1** | Hotfix de instrumentación de `task_created` en Android 3.2 (P0) | Mobile Eng | Tareas/proyecto en Android ≥ 2.5× |
| **Semana 2** | Rehacer el dashboard: (a) desglose por canal, (b) solo cohortes maduras, (c) Android 3.2 marcado, (d) tolerancia de reloj o UTC | Analytics | Ningún KPI ejecutivo sin corte por canal |
| **Mes 1** | Guided 2.0 enfocado en **llegar a 3 tareas en 72 h** (plantillas de tareas, checklist), no en invitar colaboradores | Producto | % con ≥3 tareas en 72 h |
| **Mes 1** | Prueba de precio controlada $15 vs $18 midiendo conversión **y retención a 90 días**, vigilando Organic y Web | Growth / Finanzas | Ingreso a 90 días por trial |
| **Mes 2** | Auditoría de CAC de la Creator Campaign. Con $1.95 por trial (38 % de lo que deja Organic), su CAC tendría que ser < ~40 % del de los otros canales para empatar | Marketing | LTV/CAC por canal |
| **Mes 2** | Probar trial de 7 vs 14 días (74 % paga antes del día 7) | Growth | Conversión y tiempo al pago |
| **Mes 3** | Programa de referidos: es el canal de 3.6× más valor | Growth | % de signups por Referral |

### Qué nos haría cambiar de opinión

- Que el grupo de control al 10 % muestre un lift < 2 pp después de 6 semanas. En ese caso, el efecto observado era sesgo de selección.
- Que la retención en los meses 2–3 de usuarios Guided sea menor. Eso indicaría que Guided "empuja" pagos de baja calidad.
- Que el hotfix de Android revele que en 3.2 sí hubo una caída real de uso (si la activación corregida no vuelve a ~40–45 %).

---

## 9. Correcciones a los documentos previos

| Documento | Afirmación | Dato verificado |
|---|---|---|
| GUIA | Ingreso por trial Pre = $4.85 | **$4.82** |
| DATA_UNDERSTANDING | Precios: 434 / 970 / 396 usuarios | **450 / 986 / 364** |
| GUIA / FASE_1 | "Guided gana en el 100 % de canales y plataformas" | Cierto por canal y por plataforma; en canal × plataforma, 3 de 12 combinaciones salen negativas (n chico) |
| GUIA | "Expandir al 100 % de inmediato", "éxito rotundo", "irrefutable" | Evidencia observacional fuerte, no causal → expandir al 90 % con control |
| GUIA | "Guided reduce la sensibilidad al precio" | El precio es inelástico **en ambos grupos**, incluido Classic Pre. No es un efecto de Guided |
| GUIA | Guided 2.0 con invitación de colaboradores | Colaborador no aporta nada incremental una vez activado el usuario |
| GUIA Q3 | "La conversión de Android subió, prueba del bug" | +1.9 pp es ruido. La prueba es el histograma de tareas cortado |
| Vistas SQL | Ventana estricta `event_at >= signup_at` | Subestima la activación de signups nocturnos en ~13 pp. Usar tolerancia o UTC |

---

## 10. Nota de uso de IA

- **Cómo se usó:** se usó un asistente de IA (Claude) como copiloto analítico. Escribió las consultas SQL contra la base PostgreSQL del caso, propuso el marco de descomposición tasa/mix y las pruebas de robustez, y redactó el primer borrador de esta narrativa.
- **Cómo se validó:**
  1. Cada número se recalculó desde las tablas raw con SQL, sin confiar en las vistas precalculadas, cuya lógica se revisó línea por línea.
  2. Las descomposiciones se verificaron con cierre matemático exacto (Σ tasa + Σ mix = Δ total).
  3. Las cifras de los documentos previos se contrastaron con la data y las discrepancias quedaron listadas (sección 9).
  4. Cada "hallazgo" se sometió a una prueba de artefacto o ruido antes de reportarlo (sección 6.6).
- **Responsabilidad:** la interpretación, el juicio sobre causalidad y la recomendación final son del analista.

---

## Anexo · Definiciones usadas

- **Activación (oficial):** ≥1 `project_created` y ≥3 `task_created` en `[signup_at, signup_at + 7 días]`. Variante tolerante: `[signup_at − 15 h, signup_at + 7 días]`.
- **Conversión:** `converted_at ≤ signup_at + 14 días`.
- **Ingreso por trial (RPTS):** precio mensual si convierte en 14 días, 0 si no; promedio sobre todos los trials. Es el primer mes, no el LTV.
- **Cohorte madura (conversión):** `signup_at < 2026-07-24`.
- **Descomposición tasa/mix:** `Tasa_v = w_post,v × (r_post,v − r_pre,v)`; `Mix_v = (w_post,v − w_pre,v) × (r_pre,v − R_pre)`, donde `w` es el peso del canal en los signups y `R_pre` la conversión total Pre. La suma cierra exacto con el Δ total.
- **IC 95 %:** diferencia de proporciones con error estándar no agrupado; z con varianza agrupada.
