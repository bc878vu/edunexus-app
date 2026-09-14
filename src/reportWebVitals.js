const reportWebVitals = onPerfEntry => {
  if (typeof onPerfEntry !== 'function') return;

  import('web-vitals').then((vitals) => {
    const reporters = [
      vitals.onCLS || vitals.getCLS,
      vitals.onFCP || vitals.getFCP,
      vitals.onINP || vitals.getFID,
      vitals.onLCP || vitals.getLCP,
      vitals.onTTFB || vitals.getTTFB,
    ].filter(fn => typeof fn === 'function');

    reporters.forEach((reporter) => {
      try {
        reporter((metric) => {
          if (metric && typeof metric === 'object' && Number.isFinite(metric.value)) {
            try { onPerfEntry(metric); } catch (_) {}
          }
        });
      } catch (_) {
        // Performance telemetry is optional and must never affect the app UI.
      }
    });
  }).catch(() => {
    // Optional telemetry must never create a console/runtime failure.
  });
};

export default reportWebVitals;
