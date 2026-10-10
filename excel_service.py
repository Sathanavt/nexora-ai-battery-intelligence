import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'NEXORA_AI_Generated_Synthetic_Battery_Dataset.xlsx')

def create_initial_workbook_if_missing():
    os.makedirs(os.path.dirname(EXCEL_PATH), exist_ok=True)
    if os.path.exists(EXCEL_PATH):
        return

    print("Creating initial synthetic dataset...")
    # Generate mock data
    batteries = ['NX-18650-001', 'NX-18650-002']
    
    # 1. Battery Summary
    df_summary = pd.DataFrame({
        'BatteryID': batteries,
        'CellType': ['INR18650-20R', 'INR18650-20R'],
        'Chemistry': ['NMC / Graphite', 'NMC / Graphite'],
        'Application': ['EV Traction', 'EV Traction'],
        'EOL_Criterion_SOH': [80.0, 80.0],
        'ReferenceCapacity_Ah': [2.0, 2.0]
    })

    # Generate records
    input_data = []
    processed_data = []
    forecast_data = []
    anomaly_data = []

    start_date = datetime(2025, 1, 1)

    for bid in batteries:
        current_cycle = 426 if bid == 'NX-18650-001' else 210
        for cycle in range(0, 601, 10):
            # Create timestamp spaced by ~1 day per cycle
            ts = start_date + timedelta(days=cycle)
            
            # Synthetic Inputs
            temp = 25.0 + (cycle / 600.0) * 5 + np.random.normal(0, 1)
            volt = 4.2 - (cycle / 600.0) * 0.1 + np.random.normal(0, 0.01)
            curr = 2.5 + np.random.normal(0, 0.1)
            imp = 20.0 + (cycle / 600.0) * 15 + np.random.normal(0, 0.5)

            input_data.append({
                'BatteryID': bid,
                'Cycle': cycle,
                'Timestamp': ts,
                'Voltage_V': round(volt, 2),
                'Current_A': round(curr, 2),
                'Temperature_C': round(temp, 2),
                'Impedance_mOhm': round(imp, 2)
            })

            # Processed Data (historical only if <= current_cycle)
            if cycle <= current_cycle:
                soh = 100 - (13.6 * ((cycle / 425)**1.2))
                soc = 95 - ((cycle % 100) / 100) * 70
                processed_data.append({
                    'BatteryID': bid,
                    'Cycle': cycle,
                    'Timestamp': ts,
                    'SOH_Percent': round(soh, 2),
                    'SOC_Percent': round(soc, 2),
                    'Capacity_Ah': round(2.0 * (soh/100), 2)
                })
            
            # Forecasts (predicted trajectory)
            if cycle >= current_cycle - 25:
                # EOL is always 600 for demo
                rul = 600 - cycle
                pred_soh = 100 - (13.6 * ((cycle / 425)**1.2)) if cycle <= 425 else 86.4 - ((86.4 - 80)/(600-425))*(cycle-425)
                forecast_data.append({
                    'BatteryID': bid,
                    'Cycle': cycle,
                    'Timestamp': ts,
                    'Predicted_SOH': round(pred_soh, 2),
                    'RUL_Cycles': rul,
                    'Predicted_EOL_Cycle': 600
                })

        # Inject Anomalies
        if bid == 'NX-18650-001':
            anomaly_data.extend([
                {
                    'EventID': 'EVT-001', 'BatteryID': bid, 'Cycle': 423,
                    'Timestamp': start_date + timedelta(days=423),
                    'Type': 'Thermal', 'Severity': 'ELEVATED', 'Status': 'INVESTIGATING',
                    'Parameter': 'Temperature', 'Score': 0.85, 'Confidence': '89%',
                    'Observed': '34.2 °C', 'Expected': '28.0 - 32.0 °C',
                    'Consequence': 'Repeated thermal stress → Increased degradation risk → Possible faster capacity fade → Potential earlier EOL',
                    'Action': 'Monitor the affected parameter and investigate recurrence.',
                    'ActionPriority': 'Medium', 'Impact': 'Battery-life impact not quantified by the current model.'
                },
                {
                    'EventID': 'EVT-002', 'BatteryID': bid, 'Cycle': 410,
                    'Timestamp': start_date + timedelta(days=410),
                    'Type': 'Electrical', 'Severity': 'WATCH', 'Status': 'RESOLVED',
                    'Parameter': 'Impedance', 'Score': 0.65, 'Confidence': '76%',
                    'Observed': '38.5 mΩ', 'Expected': '30.0 - 35.0 mΩ',
                    'Consequence': 'Increased internal resistance → Lower efficiency → Potential thermal generation',
                    'Action': 'Routine calibration performed. No further action needed.',
                    'ActionPriority': 'Low', 'Impact': 'Negligible immediate impact.'
                }
            ])

    df_input = pd.DataFrame(input_data)
    df_processed = pd.DataFrame(processed_data)
    df_forecast = pd.DataFrame(forecast_data)
    df_anomaly = pd.DataFrame(anomaly_data)

    df_model_perf = pd.DataFrame({
        'Model': ['Linear Regression', 'SVR', 'Random Forest', 'XGBoost'],
        'SOH_MAE': [2.1, 1.8, 1.2, 0.9],
        'SOH_RMSE': [2.8, 2.1, 1.5, 1.1],
        'SOH_R2': [0.75, 0.82, 0.91, 0.94],
        'RUL_MAE': [25, 20, 14, 12],
        'RUL_RMSE': [30, 24, 18, 15]
    })

    with pd.ExcelWriter(EXCEL_PATH) as writer:
        df_summary.to_excel(writer, sheet_name='BatterySummary', index=False)
        df_input.to_excel(writer, sheet_name='SyntheticInputData', index=False)
        df_processed.to_excel(writer, sheet_name='ProcessedData', index=False)
        df_forecast.to_excel(writer, sheet_name='HealthForecasts', index=False)
        df_anomaly.to_excel(writer, sheet_name='AnomalyLog', index=False)
        df_model_perf.to_excel(writer, sheet_name='ModelPerformanceDemo', index=False)
        
    print(f"Dataset created at {EXCEL_PATH}")

def load_data():
    create_initial_workbook_if_missing()
    sheets = pd.read_excel(EXCEL_PATH, sheet_name=None)
    return sheets
