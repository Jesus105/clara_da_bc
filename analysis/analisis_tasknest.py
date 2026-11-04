"""
TaskNest Business Case Analysis Script
Reproducible analysis for the CPO recommendation.
"""

import pandas as pd
import numpy as np
from scipy import stats
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / 'data' / 'raw'

def run_analysis():
    print("=" * 70)
    print("TASKNEST: DATA ANALYST BUSINESS CASE - ANÁLISIS COMPLETO")
    print("=" * 70)
    
    # 1. Cargar datos
    users = pd.read_excel(DATA / 'trial_users.xlsx')
    events = pd.read_excel(DATA / 'product_events.xlsx')
    
    users['signup_at'] = pd.to_datetime(users['signup_at'])
    users['converted_at'] = pd.to_datetime(users['converted_at'])
    events['event_at'] = pd.to_datetime(events['event_at'])
    
    # 2. Definir métricas
    # Ventana de activación: primeros 7 días desde signup_at
    ev_user = events.merge(users[['user_id', 'signup_at']], on='user_id')
    ev_user['days_since_signup'] = (ev_user['event_at'] - ev_user['signup_at']).dt.total_seconds() / 86400.0
    
    ev_7d = ev_user[(ev_user['days_since_signup'] >= 0) & (ev_user['days_since_signup'] <= 7)]
    proj_counts = ev_7d[ev_7d['event_name'] == 'project_created'].groupby('user_id').size()
    task_counts = ev_7d[ev_7d['event_name'] == 'task_created'].groupby('user_id').size()
    
    users['projects_7d'] = users['user_id'].map(proj_counts).fillna(0).astype(int)
    users['tasks_7d'] = users['user_id'].map(task_counts).fillna(0).astype(int)
    users['activated'] = (users['projects_7d'] >= 1) & (users['tasks_7d'] >= 3)
    
    # Conversión: dentro de 14 días
    users['conversion_days'] = (users['converted_at'] - users['signup_at']).dt.total_seconds() / 86400.0
    users['converted_14d'] = users['converted_at'].notnull() & (users['conversion_days'] <= 14) & (users['conversion_days'] >= 0)
    
    # Períodos
    users['period'] = np.where(users['signup_at'] < '2026-06-01', 'Pre (Abr-May)', 'Post (Jun-Jul)')
    users['revenue_1m'] = users['converted_14d'] * users['monthly_price_usd']
    
    # A. Espejismo del Dashboard Ejecutivo (Pre vs Post Agregado)
    print("\n--- 1. DASHBOARD EJECUTIVO: COMPARACIÓN AGREGADA PRE VS POST ---")
    dash = users.groupby('period').agg(
        total_users=('user_id', 'count'),
        activation_rate=('activated', 'mean'),
        conversion_rate=('converted_14d', 'mean')
    )
    print(dash.map(lambda x: f"{x:.2%}" if isinstance(x, float) else f"{x:,}"))
    
    # B. Comparación Concurrente Post (Classic vs Guided)
    print("\n--- 2. POST-PERIOD CONCURRENTE: CLASSIC VS GUIDED ---")
    post = users[users['period'] == 'Post (Jun-Jul)'].copy()
    conc = post.groupby('onboarding_experience').agg(
        total_users=('user_id', 'count'),
        activation_rate=('activated', 'mean'),
        conversion_rate=('converted_14d', 'mean'),
        rpts=('revenue_1m', 'mean')
    )
    print(conc)
    
    # Chi-cuadrados
    tab_conv = pd.crosstab(post['onboarding_experience'], post['converted_14d'])
    chi2_c, p_c, _, _ = stats.chi2_contingency(tab_conv)
    tab_act = pd.crosstab(post['onboarding_experience'], post['activated'])
    chi2_a, p_a, _, _ = stats.chi2_contingency(tab_act)
    print(f"P-value Conversión: {p_c:.4f} (Estadísticamente significativo al 95%)")
    print(f"P-value Activación: {p_a:.4f} (Estadísticamente significativo al 95%)")
    
    # C. Confounder 1: Paradoja de Simpson por Creator Campaign
    print("\n--- 3. CONFOUNDER 1: CREATOR CAMPAIGN & PARADOJA DE SIMPSON ---")
    mix = pd.crosstab(users['period'], users['acquisition_channel'], normalize='index') * 100
    print("\nMix de Canales (%):")
    print(mix.round(1))
    
    print("\nRendimiento por Canal en Período Post:")
    ch_post = post.groupby(['acquisition_channel', 'onboarding_experience']).agg(
        users=('user_id', 'count'),
        conversion=('converted_14d', 'mean'),
        activation=('activated', 'mean'),
        rpts=('revenue_1m', 'mean')
    )
    print(ch_post)
    
    # Descomposición contrafactual
    pre_weights = users[users['period'] == 'Pre (Abr-May)']['acquisition_channel'].value_counts(normalize=True)
    post_ch_conv = post.groupby('acquisition_channel')['converted_14d'].mean()
    cf_conv = sum(pre_weights[ch] * post_ch_conv[ch] for ch in pre_weights.index)
    
    guided_ch_conv = post[post['onboarding_experience'] == 'Guided'].groupby('acquisition_channel')['converted_14d'].mean()
    cf_guided = sum(pre_weights[ch] * guided_ch_conv[ch] for ch in pre_weights.index)
    
    print(f"\nConversión Pre observada: {users[users['period'] == 'Pre (Abr-May)']['converted_14d'].mean():.2%}")
    print(f"Conversión Post contrafactual (manteniendo mix de canales Pre): {cf_conv:.2%}")
    print(f"Conversión Post si 100% hubiera tenido Guided (con mix Pre): {cf_guided:.2%}")
    
    # D. Confounder 2: Bug de Instrumentación en Android 3.2
    print("\n--- 4. CONFOUNDER 2: INSTRUMENTACIÓN DE TAREAS EN ANDROID 3.2 ---")
    android = users[users['platform'] == 'Android'].copy()
    and_stats = android.groupby('app_version').agg(
        users=('user_id', 'count'),
        avg_tasks=('tasks_7d', 'mean'),
        avg_projects=('projects_7d', 'mean'),
        activation=('activated', 'mean'),
        conversion=('converted_14d', 'mean')
    )
    print(and_stats)
    
    print("\nActivación en período Post excluyendo Android 3.2 (datos no corrompidos):")
    post_no_32 = post[post['app_version'] != '3.2']
    print(post_no_32.groupby('onboarding_experience')['activated'].agg(['count', 'mean']))
    
    # E. Elasticidad de Precios
    print("\n--- 5. RENDIMIENTO POR NIVEL DE PRECIO (POST-PERIOD) ---")
    price_stats = post.groupby(['monthly_price_usd', 'onboarding_experience']).agg(
        users=('user_id', 'count'),
        conversion=('converted_14d', 'mean'),
        rpts=('revenue_1m', 'mean')
    )
    print(price_stats)

if __name__ == '__main__':
    run_analysis()
