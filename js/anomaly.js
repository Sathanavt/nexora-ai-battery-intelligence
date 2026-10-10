import { AuthService } from './authService.js';
import { API_BASE_URL } from './apiConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication
  const user = AuthService.getCurrentUser();
  if (!user) {
    sessionStorage.setItem('nexora_return_url', window.location.pathname.split('/').pop() || 'anomaly.html');
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

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const batterySelect = document.getElementById('batterySelect');
      const batteryId = batterySelect ? batterySelect.value : 'NX-18650-001';
      window.location.href = `${API_BASE_URL}/api/reports/excel?battery_id=${batteryId}`;
    });
  }

  // 2. Mock Anomaly Data
  const anomalyEvents = [
    {
      id: 1,
      cycle: 423,
      type: 'Thermal',
      severity: 'ELEVATED',
      parameter: 'Temperature',
      confidence: '89%',
      status: 'INVESTIGATING',
      score: 0.85,
      evidence: { obs: '34.2 °C', exp: '28.0 - 32.0 °C', rate: '0.4 °C/min' },
      consequence: 'Repeated thermal stress → Increased degradation risk → Possible faster capacity fade → Potential earlier EOL',
      impact: 'Battery-life impact not quantified by the current model.',
      action: { priority: 'Medium', desc: 'Monitor the affected parameter and investigate recurrence.', state: 'Monitoring' }
    },
    {
      id: 2,
      cycle: 410,
      type: 'Electrical',
      severity: 'WATCH',
      parameter: 'Impedance',
      confidence: '76%',
      status: 'RESOLVED',
      score: 0.65,
      evidence: { obs: '38.5 mΩ', exp: '30.0 - 35.0 mΩ', rate: null },
      consequence: 'Increased internal resistance → Lower efficiency → Potential thermal generation',
      impact: 'Negligible immediate impact.',
      action: { priority: 'Low', desc: 'Routine calibration performed. No further action needed.', state: 'Resolved' }
    },
    {
      id: 3,
      cycle: 395,
      type: 'Electrical',
      severity: 'WATCH',
      parameter: 'Voltage Drop',
      confidence: '81%',
      status: 'RESOLVED',
      score: 0.60,
      evidence: { obs: '3.6V under load', exp: '3.8V under load', rate: null },
      consequence: 'Unexpected voltage sag → Possible connection issue or temporary load spike',
      impact: 'Battery-life impact not quantified by the current model.',
      action: { priority: 'Low', desc: 'Checked connections. False positive likely.', state: 'Resolved' }
    }
  ];

  // Helper for severity classes
  function getSeverityClass(sev) {
    if (sev === 'CRITICAL') return 'sev-critical';
    if (sev === 'ELEVATED') return 'sev-elevated';
    if (sev === 'WATCH') return 'sev-watch';
    return 'sev-normal';
  }

  // 3. Render Event Log
  const tbody = document.getElementById('eventLogBody');
  const intelContent = document.getElementById('anomalyIntelligenceContent');

  function renderEventLog() {
    tbody.innerHTML = '';
    anomalyEvents.forEach((ev, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.index = idx;
      tr.innerHTML = `
        <td>${ev.cycle}</td>
        <td>${ev.type}</td>
        <td class="severity-indicator ${getSeverityClass(ev.severity)}">${ev.severity}</td>
        <td>${ev.parameter}</td>
        <td>${ev.confidence}</td>
        <td><span class="status-tag">${ev.status}</span></td>
      `;
      tr.addEventListener('click', () => selectEvent(idx));
      tbody.appendChild(tr);
    });
  }

  // 4. Update Intelligence Section
  function selectEvent(idx) {
    // Highlight row
    document.querySelectorAll('#eventLogBody tr').forEach(r => r.classList.remove('active-row'));
    const rows = document.querySelectorAll('#eventLogBody tr');
    if(rows[idx]) rows[idx].classList.add('active-row');

    const ev = anomalyEvents[idx];

    let evidenceHtml = `<div class="intel-grid">`;
    if (ev.evidence.obs) evidenceHtml += `<div class="intel-grid-item"><strong>Observed</strong>${ev.evidence.obs}</div>`;
    if (ev.evidence.exp) evidenceHtml += `<div class="intel-grid-item"><strong>Expected</strong>${ev.evidence.exp}</div>`;
    if (ev.evidence.rate) evidenceHtml += `<div class="intel-grid-item" style="grid-column: span 2;"><strong>Rise Rate</strong>${ev.evidence.rate}</div>`;
    evidenceHtml += `</div>`;

    intelContent.innerHTML = `
      <div style="margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">
        <div style="font-size: 0.85rem; color: #64748b; font-weight: 600;">Event Details</div>
        <div style="font-size: 1rem; font-weight: 700; color: #0f172a; margin-top: 0.2rem;">
          ${ev.type} Anomaly — Cycle ${ev.cycle} — <span class="${getSeverityClass(ev.severity)}">${ev.severity}</span>
        </div>
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">Model Confidence: ${ev.confidence}</div>
      </div>

      <div class="intel-section">
        <div class="intel-title">What Happened?</div>
        ${evidenceHtml}
      </div>

      <div class="intel-section">
        <div class="intel-title">Potential Consequence</div>
        <div class="intel-data" style="font-size: 0.8rem;">${ev.consequence}</div>
      </div>

      <div class="intel-section">
        <div class="intel-title">Battery-Life Impact</div>
        <div class="intel-data" style="font-size: 0.8rem; border-left-color: #94a3b8;">${ev.impact}</div>
      </div>

      <div class="intel-section">
        <div class="intel-title">Recommended Action</div>
        <div class="intel-grid" style="grid-template-columns: 1fr;">
          <div class="intel-grid-item">
            <strong>Priority: ${ev.action.priority} | Status: ${ev.action.state}</strong>
            ${ev.action.desc}
          </div>
        </div>
      </div>
    `;
  }

  // 5. Render Chart.js Timeline
  function renderTimeline() {
    const ctx = document.getElementById('anomalyTimelineChart');
    if (!ctx || !window.Chart) return;

    // Generate background trend (0 to 1)
    const labels = [];
    const trendData = [];
    const eventPoints = [];
    const eventColors = [];
    const pointRadii = [];

    for (let i = 0; i <= 500; i += 10) {
      labels.push(i);
      
      // Base score fluctuates between 0.1 and 0.3
      let score = 0.1 + (Math.random() * 0.15);
      
      // Inject events
      let isEvent = false;
      let evRef = null;
      anomalyEvents.forEach(ev => {
        if (ev.cycle >= i - 5 && ev.cycle <= i + 5) {
          isEvent = true;
          evRef = ev;
        }
      });

      if (isEvent) {
        score = evRef.score;
        eventPoints.push(score);
        pointRadii.push(6);
        if (evRef.severity === 'ELEVATED') eventColors.push('#c2410c'); // orange
        else if (evRef.severity === 'WATCH') eventColors.push('#b45309'); // amber
        else eventColors.push('#b91c1c'); // red fallback
      } else {
        eventPoints.push(null);
        pointRadii.push(0);
        eventColors.push('transparent');
      }

      trendData.push(score);
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Anomaly Events',
            data: eventPoints,
            backgroundColor: eventColors,
            borderColor: eventColors,
            borderWidth: 2,
            pointRadius: pointRadii,
            pointHoverRadius: 8,
            type: 'scatter'
          },
          {
            label: 'Base Anomaly Score',
            data: trendData,
            borderColor: '#94a3b8',
            backgroundColor: 'rgba(148, 163, 184, 0.1)',
            borderWidth: 1,
            pointRadius: 0,
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (context.datasetIndex === 0) {
                  return `Anomaly Detected (Score: ${context.parsed.y.toFixed(2)})`;
                }
                return `Score: ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Cycle' }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { title: { display: true, text: 'Anomaly Score (0-1)' }, min: 0, max: 1, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }

  // Initialize
  renderEventLog();
  if (anomalyEvents.length > 0) {
    selectEvent(0); // Select most recent by default
  }
  renderTimeline();

  // 6. Setup Filters Reactivity (Mock)
  const filters = document.querySelectorAll('.filter-select');
  filters.forEach(f => {
    f.addEventListener('change', () => {
      console.log(`Filter changed: ${f.id} = ${f.value}`);
      // In real implementation, this triggers data re-fetch and re-render
    });
  });
});
