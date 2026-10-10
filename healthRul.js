import { AuthService } from './authService.js';
import { API_BASE_URL } from './apiConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication
  const user = AuthService.getCurrentUser();
  if (!user) {
    sessionStorage.setItem('nexora_return_url', window.location.pathname.split('/').pop() || 'health-rul.html');
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('userNameDisplay').textContent = user.name;
  document.getElementById('userRoleDisplay').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    AuthService.logout();
    window.location.href = 'index.html';
  });

  // Export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const batterySelect = document.getElementById('batterySelect');
      const batteryId = batterySelect ? batterySelect.value : 'NX-18650-001';
      window.location.href = `${API_BASE_URL}/api/reports/excel?battery_id=${batteryId}`;
    });
  }

  // Common Theme colors
  const models = ['Linear Regression', 'SVR', 'Random Forest', 'XGBoost'];
  const colors = ['#94a3b8', '#38bdf8', '#0284c7', '#0369a1'];

  // State Management
  const state = {
    param: 'soh', // soh, soc, rul, eol
    chartType: 'bar', // bar or line
    currentCycle: 426
  };

  // Helper to compute cycle from calendar date
  function updateCycleFromDate() {
    const dateInput = document.getElementById('dateSelect');
    if (dateInput && dateInput.value) {
      const selected = new Date(dateInput.value);
      const base = new Date('2025-01-01');
      const diffDays = Math.floor((selected - base) / (1000 * 60 * 60 * 24));
      state.currentCycle = Math.max(10, Math.min(600, diffDays > 0 ? diffDays : 426));
    }
  }

  // Generate Data for Main Chart based on current parameter & cycle
  function generateChartData(param) {
    const labels = [];
    const historical = [];
    const predicted = [];
    const threshold = [];

    if (param === 'soh') {
      for (let i = 0; i <= 600; i += 25) {
        labels.push(i);
        if (i <= state.currentCycle) {
          const val = Math.max(75, 100 - (13.6 * Math.pow(i/425, 1.2)));
          historical.push(Number(val.toFixed(1)));
          predicted.push(null);
        } else {
          historical.push(null);
          const lastVal = Math.max(75, 100 - (13.6 * Math.pow(state.currentCycle/425, 1.2)));
          const dropRate = (lastVal - 80) / Math.max(1, (600 - state.currentCycle));
          const pVal = Math.max(70, lastVal - (dropRate * (i - state.currentCycle)));
          predicted.push(Number(pVal.toFixed(1)));
        }
        threshold.push(80);
      }
      return { labels, historical, predicted, threshold, yLabel: 'Battery Health Index (%)' };
    } 
    else if (param === 'soc') {
      for (let i = 0; i <= 600; i += 25) {
        labels.push(i);
        const cycleMod = (i % 100) / 100;
        const val = 95 - (cycleMod * 70); 
        historical.push(i <= state.currentCycle ? Number(val.toFixed(1)) : null);
        predicted.push(i > state.currentCycle ? Number((val * 0.95).toFixed(1)) : null);
        threshold.push(null);
      }
      return { labels, historical, predicted, threshold, yLabel: 'SOC (%)' };
    }
    else if (param === 'rul') {
      for (let i = 0; i <= 600; i += 25) {
        labels.push(i);
        const estRUL = Math.max(0, 600 - i);
        if (i <= state.currentCycle) {
          historical.push(estRUL);
          predicted.push(null);
        } else {
          historical.push(null);
          predicted.push(estRUL);
        }
        threshold.push(0);
      }
      return { labels, historical, predicted, threshold, yLabel: 'Remaining Useful Life (cycles)' };
    }
    else if (param === 'eol') {
      for (let i = 0; i <= 600; i += 25) {
        labels.push(i);
        if (i <= state.currentCycle) {
          historical.push(600);
          predicted.push(null);
        } else {
          historical.push(null);
          predicted.push(600);
        }
        threshold.push(600);
      }
      return { labels, historical, predicted, threshold, yLabel: 'Predicted EOL cycle' };
    }
  }

  // Render Main Chart (Supports both Bar and Line charts)
  const mainCtx = document.getElementById('parameterAnalysisChart');
  let mainChart = null;

  function updateMainChart(param) {
    updateCycleFromDate();
    const data = generateChartData(param);
    
    if (mainChart) mainChart.destroy();

    const isBar = state.chartType === 'bar';
    
    mainChart = new Chart(mainCtx, {
      type: isBar ? 'bar' : 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Actual / Historical',
            data: data.historical,
            backgroundColor: isBar ? '#0284c7' : 'transparent',
            borderColor: '#0f172a',
            borderWidth: isBar ? 1 : 2,
            borderRadius: isBar ? 4 : 0,
            tension: param === 'soc' ? 0.4 : 0.2
          },
          {
            label: 'Predicted / Forecast',
            data: data.predicted,
            backgroundColor: isBar ? 'rgba(56, 189, 248, 0.6)' : 'transparent',
            borderColor: '#38bdf8',
            borderDash: isBar ? [] : [5, 5],
            borderWidth: isBar ? 1 : 2,
            borderRadius: isBar ? 4 : 0,
            tension: 0.2
          },
          {
            label: param === 'soh' ? 'EOL Threshold (80%)' : (param === 'rul' ? 'Zero RUL' : 'Target EOL'),
            data: data.threshold,
            type: 'line',
            borderColor: '#ef4444',
            borderDash: [3, 3],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          }
        ].filter(ds => ds.data.some(v => v !== null))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Cycle' } },
          y: { 
            title: { display: true, text: data.yLabel },
            min: param === 'soh' ? 70 : undefined
          }
        }
      }
    });
  }

  // Update Dynamic Text Sections
  function updateSidePanels(param) {
    const summaryContainer = document.getElementById('forecastSummaryContent');
    const aiText = document.getElementById('aiInterpretationText');

    const sohVal = Math.max(75, 100 - (13.6 * Math.pow(state.currentCycle/425, 1.2))).toFixed(1);
    const rulVal = Math.max(0, 600 - state.currentCycle);

    // Update KPI card text dynamically if present
    const kpiVals = document.querySelectorAll('.kpi-value');
    if (kpiVals.length >= 4) {
      kpiVals[0].innerHTML = `${sohVal}<span class="kpi-unit">%</span>`;
      kpiVals[2].innerHTML = `${rulVal}<span class="kpi-unit"> cycles</span>`;
    }

    if (param === 'soh') {
      summaryContainer.innerHTML = `
        <div class="param-row"><span class="param-name">Current SOH</span><span class="param-val">${sohVal} %</span></div>
        <div class="param-row"><span class="param-name">Predicted SOH (EOL)</span><span class="param-val">80.0 %</span></div>
        <div class="param-row"><span class="param-name">Current Cycle</span><span class="param-val">${state.currentCycle}</span></div>
        <div class="param-row"><span class="param-name">Forecast horizon</span><span class="param-val">${rulVal} cycles</span></div>
      `;
      aiText.innerText = `At cycle ${state.currentCycle}, the battery health index is estimated at ${sohVal}%. The degradation trajectory is evaluated against the 80% EOL threshold.`;
    } else if (param === 'soc') {
      summaryContainer.innerHTML = `
        <div class="param-row"><span class="param-name">Current SOC</span><span class="param-val">72.3 %</span></div>
        <div class="param-row"><span class="param-name">Change in SOC (1hr)</span><span class="param-val">+1.1 %</span></div>
        <div class="param-row"><span class="param-name">Current Cycle</span><span class="param-val">${state.currentCycle}</span></div>
      `;
      aiText.innerText = "The current state of charge reflects available charge under the selected operating conditions.";
    } else if (param === 'rul') {
      summaryContainer.innerHTML = `
        <div class="param-row"><span class="param-name">Current RUL</span><span class="param-val">${rulVal} cycles</span></div>
        <div class="param-row"><span class="param-name">Lower estimate</span><span class="param-val">${Math.max(0, rulVal - 12)} cycles</span></div>
        <div class="param-row"><span class="param-name">Upper estimate</span><span class="param-val">${rulVal + 12} cycles</span></div>
        <div class="param-row"><span class="param-name">Predicted EOL</span><span class="param-val">Cycle 600</span></div>
      `;
      aiText.innerText = `The model estimates ${rulVal} remaining cycles before reaching the end-of-life limit.`;
    } else if (param === 'eol') {
      summaryContainer.innerHTML = `
        <div class="param-row"><span class="param-name">Predicted EOL</span><span class="param-val">Cycle 600</span></div>
        <div class="param-row"><span class="param-name">Current Cycle</span><span class="param-val">${state.currentCycle}</span></div>
        <div class="param-row"><span class="param-name">Remaining cycles</span><span class="param-val">${rulVal} cycles</span></div>
      `;
      aiText.innerText = "The projected EOL cycle is derived from the current cycle and predicted remaining useful life.";
    }
  }

  // Model Performance Data
  const perfData = {
    soh: {
      mae: [2.1, 1.8, 1.2, 0.9],
      rmse: [2.8, 2.1, 1.5, 1.1],
      r2: [0.75, 0.82, 0.91, 0.94],
      mape: [2.5, 2.1, 1.4, 1.0]
    },
    soc: {
      mae: [3.5, 3.1, 2.5, 2.2],
      rmse: [4.2, 3.8, 3.0, 2.7],
      r2: [0.65, 0.71, 0.82, 0.85],
      mape: [5.2, 4.8, 3.5, 3.1]
    },
    rul: {
      mae: [25, 20, 14, 12],
      rmse: [30, 24, 18, 15],
      r2: [0.60, 0.68, 0.85, 0.89],
      mape: [15.2, 12.1, 8.5, 7.2]
    },
    eol: {
      mae: [25, 20, 14, 12],
      rmse: [30, 24, 18, 15],
      r2: [0.60, 0.68, 0.85, 0.89],
      mape: [null, null, null, null]
    }
  };

  let charts = {};

  function initBarChart(id, title, dataArray) {
    const ctx = document.getElementById(id);
    if (charts[id]) charts[id].destroy();
    
    const isNulled = dataArray.every(v => v === null);
    
    charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: models,
        datasets: [{
          data: isNulled ? [0,0,0,0] : dataArray,
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (isNulled) return 'N/A';
                return context.parsed.y;
              }
            }
          }
        },
        scales: {
          x: { display: false },
          y: { 
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (isNulled) return 'N/A';
                return value;
              }
            }
          }
        }
      }
    });
  }

  function updatePerformanceCharts(param) {
    const data = perfData[param];
    initBarChart('maeChart', 'MAE', data.mae);
    initBarChart('rmseChart', 'RMSE', data.rmse);
    initBarChart('r2Chart', 'R2 Score', data.r2);
    initBarChart('mapeChart', 'MAPE', data.mape);
  }

  // Setup UI Syncing
  const mainSelect = document.getElementById('mainChartParamSelect');
  const perfSelect = document.getElementById('perfParamSelect');
  const chartTypeSelect = document.getElementById('chartTypeSelect');

  function syncAndRefresh() {
    if (mainSelect) state.param = mainSelect.value;
    if (chartTypeSelect) state.chartType = chartTypeSelect.value;

    if (perfSelect) perfSelect.value = state.param;
    
    updateMainChart(state.param);
    updateSidePanels(state.param);
    updatePerformanceCharts(state.param);
  }

  if (mainSelect) mainSelect.addEventListener('change', syncAndRefresh);
  if (perfSelect) perfSelect.addEventListener('change', (e) => {
    if (mainSelect) mainSelect.value = e.target.value;
    syncAndRefresh();
  });
  if (chartTypeSelect) chartTypeSelect.addEventListener('change', syncAndRefresh);

  // Bind Calendar Date Picker & Filter Controls to update graph live
  const filterInputs = document.querySelectorAll('.filter-select');
  filterInputs.forEach(input => {
    input.addEventListener('change', syncAndRefresh);
    input.addEventListener('input', syncAndRefresh);
  });

  // Initial render
  syncAndRefresh();

});
