from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import numpy as np
import os
import json
from .excel_service import load_data, EXCEL_PATH

app = FastAPI(title="NEXORA Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def filter_dataframe(df, battery_id, year=None, month=None, date=None, start_cycle=None, end_cycle=None):
    if df.empty or 'BatteryID' not in df.columns:
        return df

    mask = (df['BatteryID'] == battery_id)
    if start_cycle is not None:
        mask &= (df['Cycle'] >= start_cycle)
    if end_cycle is not None:
        mask &= (df['Cycle'] <= end_cycle)
    
    if 'Timestamp' in df.columns:
        if date:
            # Match specific date 'YYYY-MM-DD'
            mask &= (df['Timestamp'].dt.strftime('%Y-%m-%d') == date)
        else:
            if year:
                mask &= (df['Timestamp'].dt.year == int(year))
            if month:
                mask &= (df['Timestamp'].dt.month == int(month))
                
    return df[mask]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "NEXORA API is running."}

@app.get("/api/batteries")
def get_batteries():
    sheets = load_data()
    summary = sheets['BatterySummary']
    return summary.to_dict(orient="records")

@app.get("/api/dashboard/overview")
def get_overview(
    battery_id: str,
    year: str = None,
    month: str = None,
    date: str = None,
    start_cycle: int = None,
    end_cycle: int = None
):
    sheets = load_data()
    df_proc_all = sheets['ProcessedData'][sheets['ProcessedData']['BatteryID'] == battery_id]
    df_fc_all = sheets['HealthForecasts'][sheets['HealthForecasts']['BatteryID'] == battery_id]
    df_inp_all = sheets['SyntheticInputData'][sheets['SyntheticInputData']['BatteryID'] == battery_id]

    if df_proc_all.empty:
        return {"error": "No data found for selected battery."}

    # Dynamic cutoff determination by date/cycle filters
    if date:
        df_cutoff = df_proc_all[df_proc_all['Timestamp'].dt.strftime('%Y-%m-%d') <= date]
        if df_cutoff.empty:
            df_cutoff = df_proc_all.head(1)
        cutoff_cycle = int(df_cutoff.iloc[-1]['Cycle'])
    elif year or month:
        mask = pd.Series(True, index=df_proc_all.index)
        if year: mask &= (df_proc_all['Timestamp'].dt.year == int(year))
        if month: mask &= (df_proc_all['Timestamp'].dt.month == int(month))
        df_sub = df_proc_all[mask]
        cutoff_cycle = int(df_sub.iloc[-1]['Cycle']) if not df_sub.empty else int(df_proc_all.iloc[-1]['Cycle'])
    elif end_cycle:
        cutoff_cycle = int(end_cycle)
    else:
        cutoff_cycle = int(df_proc_all.iloc[-1]['Cycle'])

    min_cycle = int(start_cycle) if start_cycle is not None else 0

    # Historical: cycles between min_cycle and cutoff_cycle
    df_hist = df_proc_all[(df_proc_all['Cycle'] >= min_cycle) & (df_proc_all['Cycle'] <= cutoff_cycle)]
    
    # Forecast: cycles >= cutoff_cycle
    df_fc = df_fc_all[(df_fc_all['Cycle'] >= cutoff_cycle)]

    latest_proc = df_hist.iloc[-1] if not df_hist.empty else df_proc_all.iloc[-1]
    latest_input = df_inp_all[df_inp_all['Cycle'] <= cutoff_cycle].iloc[-1] if not df_inp_all.empty else {}
    latest_fc = df_fc.iloc[0] if not df_fc.empty else (df_fc_all.iloc[-1] if not df_fc_all.empty else {})

    historical_cycles = [int(x) for x in df_hist['Cycle'].tolist()]
    historical_soh = [float(x) for x in df_hist['SOH_Percent'].tolist()]

    forecast_cycles = [int(x) for x in df_fc['Cycle'].tolist()]
    forecast_soh = [float(x) for x in df_fc['Predicted_SOH'].tolist()]

    def clean_val(val, val_type=float):
        if val is None or pd.isna(val):
            return None
        return val_type(val)

    return {
        "kpis": {
            "soh": clean_val(latest_proc.get('SOH_Percent'), float),
            "soc": clean_val(latest_proc.get('SOC_Percent'), float),
            "capacity": clean_val(latest_proc.get('Capacity_Ah'), float),
            "rul": clean_val(latest_fc.get('RUL_Cycles'), int),
            "eol": clean_val(latest_fc.get('Predicted_EOL_Cycle'), int),
            "temperature": clean_val(latest_input.get('Temperature_C'), float),
            "voltage": clean_val(latest_input.get('Voltage_V'), float),
            "current": clean_val(latest_input.get('Current_A'), float),
            "impedance": clean_val(latest_input.get('Impedance_mOhm'), float)
        },
        "chart": {
            "historical": {"x": historical_cycles, "y": historical_soh},
            "forecast": {"x": forecast_cycles, "y": forecast_soh}
        }
    }

@app.get("/api/dashboard/anomalies")
def get_anomalies(
    battery_id: str,
    year: str = None,
    month: str = None,
    date: str = None,
    start_cycle: int = None,
    end_cycle: int = None
):
    sheets = load_data()
    df_anom = filter_dataframe(sheets['AnomalyLog'], battery_id, year, month, date, start_cycle, end_cycle)
    
    # Mocking timeline points from inputs
    df_inputs = filter_dataframe(sheets['SyntheticInputData'], battery_id, year, month, date, start_cycle, end_cycle)
    
    # create a timeline response
    timeline = []
    events_by_cycle = df_anom.set_index('Cycle').to_dict(orient='index') if not df_anom.empty else {}
    
    for _, row in df_inputs.iterrows():
        cycle = row['Cycle']
        if cycle in events_by_cycle:
            timeline.append({
                "cycle": cycle,
                "score": events_by_cycle[cycle]['Score'],
                "is_event": True,
                "severity": events_by_cycle[cycle]['Severity']
            })
        else:
            timeline.append({
                "cycle": cycle,
                "score": 0.1 + (np.random.random() * 0.1),
                "is_event": False
            })

    # Summary
    critical_count = len(df_anom[df_anom['Severity'] == 'CRITICAL']) if not df_anom.empty else 0
    watch_count = len(df_anom[df_anom['Severity'] == 'WATCH']) if not df_anom.empty else 0
    elevated_count = len(df_anom[df_anom['Severity'] == 'ELEVATED']) if not df_anom.empty else 0
    
    overall = "NORMAL"
    if critical_count > 0: overall = "CRITICAL"
    elif elevated_count > 0: overall = "ELEVATED"
    elif watch_count > 0: overall = "WATCH"

    return {
        "summary": {
            "overall": overall,
            "critical_count": critical_count,
            "watch_count": watch_count,
            "recent_cycle": int(df_anom.iloc[-1]['Cycle']) if not df_anom.empty else None
        },
        "events": df_anom.fillna("").to_dict(orient="records"),
        "timeline": timeline
    }

@app.get("/api/model-performance")
def get_model_perf():
    sheets = load_data()
    return sheets['ModelPerformanceDemo'].to_dict(orient="records")

@app.get("/api/reports/excel")
def download_excel(
    battery_id: str,
    year: str = None,
    month: str = None,
    date: str = None,
    start_cycle: int = None,
    end_cycle: int = None
):
    sheets = load_data()
    out_path = os.path.join(os.path.dirname(__file__), '..', 'data', f'Export_{battery_id}.xlsx')
    
    with pd.ExcelWriter(out_path) as writer:
        for name, df in sheets.items():
            filtered_df = filter_dataframe(df, battery_id, year, month, date, start_cycle, end_cycle)
            filtered_df.to_excel(writer, sheet_name=name, index=False)
            
    return FileResponse(out_path, filename=f"NEXORA_Export_{battery_id}.xlsx")

# Serve static frontend files
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app.mount("/", StaticFiles(directory=ROOT_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)

