/**
 * NEXORA AI Battery Intelligence Platform
 * Parameter Configuration Definition Layer
 * Serves dynamic parameters to the dashboard and allows Admin modifications.
 */

const STORAGE_KEY = 'nexora_parameters_config';

const INITIAL_PARAMETERS = [
  {
    id: 'PARAM-001',
    name: 'voltage',
    displayName: 'Pack Voltage',
    category: 'Electrical',
    unit: 'V',
    dataType: 'Float',
    description: 'Total battery pack terminal voltage output.',
    minVal: 300.0,
    maxVal: 450.0,
    warningThreshold: 420.0,
    criticalThreshold: 440.0,
    enabled: true
  },
  {
    id: 'PARAM-002',
    name: 'current',
    displayName: 'Discharge Current',
    category: 'Electrical',
    unit: 'A',
    dataType: 'Float',
    description: 'Continuous battery pack load current.',
    minVal: 0.0,
    maxVal: 350.0,
    warningThreshold: 280.0,
    criticalThreshold: 320.0,
    enabled: true
  },
  {
    id: 'PARAM-003',
    name: 'temperature',
    displayName: 'Max Cell Temp',
    category: 'Thermal',
    unit: '°C',
    dataType: 'Float',
    description: 'Highest temperature reading across internal battery module sensors.',
    minVal: 15.0,
    maxVal: 65.0,
    warningThreshold: 45.0,
    criticalThreshold: 55.0,
    enabled: true
  },
  {
    id: 'PARAM-004',
    name: 'temp_rise_rate',
    displayName: 'Temp Rise Rate',
    category: 'Thermal',
    unit: '°C/min',
    dataType: 'Float',
    description: 'Rate of thermal increase per minute.',
    minVal: 0.0,
    maxVal: 5.0,
    warningThreshold: 2.5,
    criticalThreshold: 4.0,
    enabled: true
  },
  {
    id: 'PARAM-005',
    name: 'capacity',
    displayName: 'Remaining Capacity',
    category: 'Degradation',
    unit: 'Ah',
    dataType: 'Float',
    description: 'Current energy storage capacity available.',
    minVal: 50.0,
    maxVal: 120.0,
    warningThreshold: 70.0,
    criticalThreshold: 60.0,
    enabled: true
  },
  {
    id: 'PARAM-006',
    name: 'capacity_fade',
    displayName: 'Capacity Fade Rate',
    category: 'Degradation',
    unit: '%/100 cycles',
    dataType: 'Float',
    description: 'Rate of irreversible capacity loss over cycle count.',
    minVal: 0.0,
    maxVal: 5.0,
    warningThreshold: 1.8,
    criticalThreshold: 3.0,
    enabled: true
  },
  {
    id: 'PARAM-007',
    name: 'impedance',
    displayName: 'Internal Impedance',
    category: 'Electrical',
    unit: 'mΩ',
    dataType: 'Float',
    description: 'Internal cell resistance measured via AC spectroscopy.',
    minVal: 0.8,
    maxVal: 4.5,
    warningThreshold: 2.8,
    criticalThreshold: 3.8,
    enabled: true
  },
  {
    id: 'PARAM-008',
    name: 'bhi',
    displayName: 'Battery Health Index (BHI)',
    category: 'Health',
    unit: '%',
    dataType: 'Float',
    description: 'Composite AI health score based on SOH, impedance, and thermal stress.',
    minVal: 0.0,
    maxVal: 100.0,
    warningThreshold: 80.0,
    criticalThreshold: 70.0,
    enabled: true
  },
  {
    id: 'PARAM-009',
    name: 'soc',
    displayName: 'State of Charge (SOC)',
    category: 'Health',
    unit: '%',
    dataType: 'Float',
    description: 'Real-time state of charge estimation.',
    minVal: 0.0,
    maxVal: 100.0,
    warningThreshold: 15.0,
    criticalThreshold: 5.0,
    enabled: true
  },
  {
    id: 'PARAM-010',
    name: 'rul',
    displayName: 'Remaining Useful Life (RUL)',
    category: 'Prediction',
    unit: 'Cycles',
    dataType: 'Integer',
    description: 'AI model estimation of remaining charge cycles until 80% EOL threshold.',
    minVal: 0,
    maxVal: 3500,
    warningThreshold: 400,
    criticalThreshold: 150,
    enabled: true
  },
  {
    id: 'PARAM-011',
    name: 'eol',
    displayName: 'End of Life (EOL) Target',
    category: 'Prediction',
    unit: 'Date / %',
    dataType: 'String',
    description: 'Projected date of battery pack replacement eligibility.',
    minVal: 80.0,
    maxVal: 80.0,
    warningThreshold: 82.0,
    criticalThreshold: 80.0,
    enabled: true
  }
];

export const ParameterService = {
  getParameters() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_PARAMETERS;
    } catch (e) {
      return INITIAL_PARAMETERS;
    }
  },

  getEnabledParameters() {
    return this.getParameters().filter(p => p.enabled);
  },

  updateParameter(updatedParam) {
    const params = this.getParameters();
    const idx = params.findIndex(p => p.id === updatedParam.id);
    if (idx !== -1) {
      params[idx] = { ...params[idx], ...updatedParam };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
      return true;
    }
    return false;
  },

  resetDefaults() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
