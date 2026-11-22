import { useEffect, useRef, useState } from 'react';
import { MenuItem, Select } from '@mui/material';

const taskMenuMaxHeight = 240;
const taskMenuGap = 6;
const taskMenuViewportMargin = 16;

export function ChartTaskSelect({ tasks, value, onChange, label, allLabel }: {
  tasks: string[];
  value: string;
  onChange: (task: string) => void;
  label: string;
  allLabel?: string;
}) {
  const taskSelect = useRef<HTMLDivElement>(null);
  const [taskMenu, setTaskMenu] = useState<{ above: boolean; height: number; anchorOffset: number } | null>(null);
  const menuOpen = taskMenu !== null;

  function positionTaskMenu() {
    const anchor = taskSelect.current?.getBoundingClientRect();
    if (!anchor) return;

    const inset = taskMenuGap + taskMenuViewportMargin;
    const spaceBelow = window.innerHeight - anchor.bottom - inset;
    const spaceAbove = anchor.top - inset;
    const above = spaceBelow < taskMenuMaxHeight && spaceAbove > spaceBelow;
    setTaskMenu({
      above,
      height: Math.max(0, Math.min(taskMenuMaxHeight, above ? spaceAbove : spaceBelow)),
      anchorOffset: above ? -taskMenuGap : anchor.height + taskMenuGap,
    });
  }

  useEffect(() => {
    if (!menuOpen) return;
    window.addEventListener('resize', positionTaskMenu);
    return () => window.removeEventListener('resize', positionTaskMenu);
  }, [menuOpen]);

  return (
    <Select
      ref={taskSelect} size="small" displayEmpty={allLabel !== undefined} className="chart-task-select"
      value={value} onChange={event => onChange(event.target.value)}
      inputProps={{ 'aria-label': label }} SelectDisplayProps={{ title: value || allLabel }}
      open={menuOpen} onOpen={positionTaskMenu} onClose={() => setTaskMenu(null)}
      MenuProps={{
        marginThreshold: taskMenuViewportMargin,
        anchorOrigin: { vertical: taskMenu?.anchorOffset ?? 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: taskMenu?.above ? 'bottom' : 'top', horizontal: 'left' },
        slotProps: {
          paper: { className: 'chart-task-menu', style: { maxHeight: taskMenu?.height ?? taskMenuMaxHeight } },
          list: { dense: true },
        },
      }}
    >
      {allLabel !== undefined && <MenuItem value="">{allLabel}</MenuItem>}
      {tasks.map(task => <MenuItem key={task} value={task}>{task}</MenuItem>)}
    </Select>
  );
}
