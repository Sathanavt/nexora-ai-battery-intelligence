import { AuthService } from './authService.js';
import { API_BASE_URL } from './apiConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Check Authentication
  const user = AuthService.getCurrentUser();
  if (!user) {
    sessionStorage.setItem('nexora_return_url', window.location.pathname.split('/').pop() || 'dashboard.html');
    window.location.href = 'index.html';
    return;
  }

  // Populate user profile info in header
  document.getElementById('userNameDisplay').textContent = user.name;
  document.getElementById('userRoleDisplay').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

  // 2. Setup Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    AuthService.logout();
    window.location.href = 'index.html';
  });

  let myChart;
  const ctx = document.getElementById('healthDegradationChart');

  function getFilterParams() {
    const params = new URLSearchParams();
    const batterySelect = document.getElementById('batterySelect');
    if (batterySelect) params.append('battery_id', batterySelect.value);
    
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect && yearSelect.value) params.append('year', yearSelect.value);
    
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect && monthSelect.value) params.append('month', monthSelect.value);
    
    const dateSelect = document.getElementById('dateSelect');
    if (dateSelect && dateSelect.value) params.append('date', dateSelect.value);
    
    const cycleSelect = document.getElementById('cycleSelect');
    if (cycleSelect && cycleSelect.value) {
      const parts = cycleSelect.value.split('-');
      if (parts.length === 2) {
        params.append('start_cycle', parts[0]);
        params.append('end_cycle', parts[1]);
      }
    }
    return params.toString();
  }

  function updateDashboardUI(data) {
    if (data.error) {
      console.warn("Backend error:", data.error);
      return;
    }

    // Update KPIs
    const kpis = data.kpis;
    if (kpis) {
      const kpiValues = document.querySelectorAll('.kpi-value');
      if (kpiValues.length >= 4) {
        kpiValues[0].innerHTML = `${kpis.soh !== null ? kpis.soh : '--'}<span class="kpi-unit">%</span>`;
        kpiValues[1].innerHTML = `${kpis.rul !== null ? kpis.rul : '--'}<span class="kpi-unit"> cycles</span>`;
        kpiValues[2].innerHTML = `${kpis.capacity !== null ? kpis.capacity : '--'}<span class="kpi-unit"> Ah</span>`;
        kpiValues[3].innerHTML = `${kpis.temperature !== null ? kpis.temperature : '--'}<span class="kpi-unit"> °C</span>`;
      }
      
      // Update parameter readings
      document.querySelectorAll('.param-row').forEach(row => {
        const nameNode = row.querySelector('.param-name');
        const valNode = row.querySelector('.param-val');
        if (nameNode && valNode) {
          const name = nameNode.textContent.trim().toLowerCase();
          if (name === 'voltage' && kpis.voltage) valNode.innerHTML = `${kpis.voltage} <span class="param-unit">V</span>`;
          if (name === 'current' && kpis.current) valNode.innerHTML = `${kpis.current} <span class="param-unit">A</span>`;
          if (name === 'impedance' && kpis.impedance) valNode.innerHTML = `${kpis.impedance} <span class="param-unit">mΩ</span>`;
          if (name === 'temperature' && kpis.temperature) valNode.innerHTML = `${kpis.temperature} <span class="param-unit">°C</span>`;
        }
      });
    }

    // Update Chart
    if (data.chart && ctx && window.Chart) {
      const hist = data.chart.historical;
      const fc = data.chart.forecast;
      
      const combinedLabels = Array.from(new Set([...hist.x, ...fc.x])).sort((a,b) => a-b);
      
      const histDataMap = {};
      hist.x.forEach((val, idx) => { histDataMap[val] = hist.y[idx]; });
      
      const fcDataMap = {};
      fc.x.forEach((val, idx) => { fcDataMap[val] = fc.y[idx]; });
      
      const mappedHist = combinedLabels.map(lbl => histDataMap[lbl] !== undefined ? histDataMap[lbl] : null);
      const mappedFc = combinedLabels.map(lbl => fcDataMap[lbl] !== undefined ? fcDataMap[lbl] : null);

      const chartTypeSelect = document.getElementById('overviewChartTypeSelect');
      const chartType = chartTypeSelect ? chartTypeSelect.value : 'line';
      const isBar = chartType === 'bar';

      if (myChart) {
        myChart.destroy();
      }

      myChart = new Chart(ctx, {
        type: isBar ? 'bar' : 'line',
        data: {
          labels: combinedLabels,
          datasets: [
            {
              label: 'Historical SOH (%)',
              data: mappedHist,
              backgroundColor: isBar ? '#0284c7' : 'transparent',
              borderColor: '#0f172a',
              borderWidth: isBar ? 1 : 2,
              borderRadius: isBar ? 4 : 0,
              pointRadius: isBar ? 0 : 2,
              tension: 0.2
            },
            {
              label: 'Forecast SOH (%)',
              data: mappedFc,
              backgroundColor: isBar ? 'rgba(56, 189, 248, 0.6)' : 'transparent',
              borderColor: '#0284c7',
              borderDash: isBar ? [] : [5, 5],
              borderWidth: isBar ? 1 : 2,
              borderRadius: isBar ? 4 : 0,
              pointRadius: isBar ? 0 : 2,
              tension: 0.2
            },
            {
              label: 'EOL Threshold (80%)',
              data: combinedLabels.map(() => 80),
              type: 'line',
              borderColor: '#ef4444',
              borderDash: [3, 3],
              borderWidth: 2,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            x: { title: { display: true, text: 'Cycle' } },
            y: { title: { display: true, text: 'Battery Health Index (%)' }, min: 70, max: 100 }
          }
        }
      });
    }
  }

  async function fetchDashboardData() {
    try {
      const q = getFilterParams();
      const res = await fetch(`${API_BASE_URL}/api/dashboard/overview?${q}`);
      const data = await res.json();
      updateDashboardUI(data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  }

  // 4. Setup Filters Interactivity
  const filters = document.querySelectorAll('.filter-select');
  filters.forEach(f => {
    f.addEventListener('change', fetchDashboardData);
    f.addEventListener('input', fetchDashboardData);
  });

  const chartTypeSelect = document.getElementById('overviewChartTypeSelect');
  if (chartTypeSelect) {
    chartTypeSelect.addEventListener('change', fetchDashboardData);
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const q = getFilterParams();
      window.location.href = `${API_BASE_URL}/api/reports/excel?${q}`;
    });
  }
  
  // Initial Fetch
  fetchDashboardData();
});
