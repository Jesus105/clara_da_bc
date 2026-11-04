// Cifras del deck. Todas fueron calculadas con SQL contra PostgreSQL (tablas raw trial_users / product_events)
// y documentadas en ANALISIS_COMPLETO_TASKNEST.md. Se guardan aquí para que el deck sea estático y reproducible.

export const DASHBOARD = {
  pre: { users: 776, act: 50.1, cvr: 32.6, rpts: 4.82 },
  post: { users: 1024, act: 37.0, cvr: 28.9, rpts: 4.29 },
}

// Descomposición tasa / mix de la CVR Pre → Post por canal (Paasche + mix centrado en Pre). Cierra exacto: −3.70 pp.
export const DECOMP = [
  { ch: 'Creator Campaign', convPre: 10.3, convPost: 13.2, wPre: 3.7, wPost: 34.1, rate: 0.97, mix: -6.75, total: -5.79 },
  { ch: 'Referral', convPre: 45.4, convPost: 50.0, wPre: 25.3, wPost: 14.5, rate: 0.66, mix: -1.38, total: -0.72 },
  { ch: 'Organic', convPre: 32.7, convPost: 36.7, wPre: 40.6, wPost: 29.3, rate: 1.16, mix: -0.01, total: 1.15 },
  { ch: 'Paid Search', convPre: 24.6, convPost: 29.1, wPre: 30.4, wPost: 22.2, rate: 1.0, mix: 0.66, total: 1.66 },
]
export const DECOMP_TOTAL = { rate: 3.79, mix: -7.49, total: -3.7 }
export const COUNTERFACTUAL = { postWithPreMix: 36.8, classicPostWithPreMix: 31.9, guidedWithPreMix: 40.3 }

// Guided vs Classic, mismas semanas (jun–jul). p en %, n usuarios.
export const CONCURRENT = [
  { metric: 'Conversion (14 days)', classic: { p: 24.6, n: 403 }, guided: { p: 31.7, n: 621 }, lift: 7.2, ci: [1.6, 12.7] },
  { metric: 'Conversion, complete cohorts only', classic: { p: 23.6, n: 339 }, guided: { p: 32.3, n: 530 }, lift: 8.7, ci: [2.6, 14.7] },
  { metric: 'Activation (excl. Android 3.2)', classic: { p: 41.8, n: 294 }, guided: { p: 51.0, n: 459 }, lift: 9.1, ci: [1.9, 16.4] },
]
export const RPTS = { classic: 3.61, guided: 4.73 }

export const STRATIFIED_LIFT = 6.9 // canal × plataforma, 12 estratos, ponderado por n

export const CLASSIC_STABILITY = [
  { ch: 'Creator Campaign', classicPre: 10.3, classicPost: 9.4, guidedPost: 15.4 },
  { ch: 'Organic', classicPre: 32.7, classicPost: 29.6, guidedPost: 41.7 },
  { ch: 'Paid Search', classicPre: 24.6, classicPost: 26.3, guidedPost: 31.1 },
  { ch: 'Referral', classicPre: 45.4, classicPost: 45.5, guidedPost: 52.7 },
]

export const PLATFORM_LIFT = [
  { pl: 'iOS 4.1', classic: 30.0, guided: 34.3 },
  { pl: 'Web', classic: 21.7, guided: 31.0 },
  { pl: 'Android 3.1', classic: 18.0, guided: 21.0 },
  { pl: 'Android 3.2', classic: 27.5, guided: 33.3 },
]

export const ANDROID = [
  { metric: 'Users with ≥3 tasks', v31: 51.0, v32: 8.1 },
  { metric: 'Activation', v31: 46.9, v32: 8.1 },
  { metric: 'Users with a project', v31: 62.8, v32: 60.9 },
  { metric: 'Conversion (14 days)', v31: 29.1, v32: 31.0 },
]
export const ANDROID_EXTRA = { tasksPerUser: [2.81, 0.94], tasksPerProject: [4.48, 1.54], payersActivated: [66.9, 7.1] }

export const SKEW_BY_HOUR = [
  { h: '06–11 h', strict: 53.4, corrected: 53.4 },
  { h: '12–17 h', strict: 50.4, corrected: 54.8 },
  { h: '18–23 h', strict: 42.1, corrected: 55.2 },
]

// Funnel 14 días (Post, sin Android 3.2, tolerancia −15 h)
export const FUNNEL = [
  { step: 'Creates a project', classic: 65.6, guided: 71.7 },
  { step: 'Creates ≥3 tasks', classic: 48.0, guided: 57.1 },
  { step: 'Sets a reminder', classic: 20.7, guided: 24.0 },
  { step: 'Invites a collaborator', classic: 7.1, guided: 10.9 },
  { step: 'Pays', classic: 23.5, guided: 31.2 },
]
export const MEDIATION = { nonActivated: [11.1, 16.8], activated: [36.9, 42.0], viaActivation: 2.3, within: 5.4 }

// Conversión por número de tareas (14 días, sin Android 3.2, n = 1,529)
export const AHA = [
  { tasks: '0', cvr: 17.7, n: 237 },
  { tasks: '1', cvr: 17.3, n: 220 },
  { tasks: '2', cvr: 16.7, n: 233 },
  { tasks: '3', cvr: 39.5, n: 190 },
  { tasks: '4', cvr: 37.6, n: 194 },
  { tasks: '5', cvr: 44.2, n: 242 },
  { tasks: '6+', cvr: 42.7, n: 213 },
]

export const PRICE = [
  { price: '$12', n: 450, cvr: 31.1, rpts: 3.73, preClassic: 32.5, postGuided: 30.3 },
  { price: '$15', n: 986, cvr: 30.6, rpts: 4.59, preClassic: 33.3, postGuided: 32.8 },
  { price: '$18', n: 364, cvr: 29.4, rpts: 5.29, preClassic: 30.8, postGuided: 30.5 },
]

// % de conversiones por día desde el registro (n = 549)
export const PAY_DAY = [8.4, 9.3, 12.4, 12.2, 11.1, 11.5, 9.5, 6.4, 5.8, 4.4, 1.8, 2.7, 1.1, 3.5] // floor(días sin redondear); 0–6 = 408/549 = 74.3%

export const CHANNELS = [
  { ch: 'Referral', n: 344, cvr: 47.4, rpts: 6.99, act: 66.0, cvrAct: 55.9, cvrNon: 30.5, guidedLift: [45.7, 53.7] },
  { ch: 'Organic', n: 615, cvr: 34.6, rpts: 5.12, act: 50.5, cvrAct: 43.9, cvrNon: 23.5, guidedLift: [26.1, 41.5] },
  { ch: 'Paid Search', n: 463, cvr: 26.8, rpts: 3.99, act: 44.6, cvrAct: 35.4, cvrNon: 18.6, guidedLift: [24.2, 30.9] },
  { ch: 'Creator Campaign', n: 378, cvr: 13.0, rpts: 1.95, act: 33.0, cvrAct: 25.3, cvrNon: 5.7, guidedLift: [9.6, 13.9] },
]
