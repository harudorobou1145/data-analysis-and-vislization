import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

export function Chart({ option, label, height = 300, onEvents }: { option: EChartsOption; label: string; height?: number; onEvents?: Record<string, (event: unknown) => void> }) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const chart = echarts.init(container.current, undefined, { renderer: 'canvas' });
    instance.current = chart;
    const observer = new ResizeObserver(() => { if (!chart.isDisposed()) chart.resize(); });
    observer.observe(container.current);
    return () => { observer.disconnect(); chart.dispose(); instance.current = null; };
  }, []);
  useEffect(() => { instance.current?.setOption(option, true); }, [option]);
  useEffect(() => {
    const chart = instance.current;
    if (!chart || !onEvents) return;
    for (const [event, handler] of Object.entries(onEvents)) chart.on(event, handler);
    return () => { if (!chart.isDisposed()) for (const [event, handler] of Object.entries(onEvents)) chart.off(event, handler); };
  }, [onEvents]);
  return <div ref={container} role="img" aria-label={label} style={{ height, width: '100%', minWidth: 0 }} />;
}
