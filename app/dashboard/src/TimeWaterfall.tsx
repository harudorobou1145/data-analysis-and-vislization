import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Slider, Stack } from '@mui/material';
import { RotateCcw } from 'lucide-react';
import { Color, OrthographicCamera, Vector3 } from 'three';
import { ChartTaskSelect } from './ChartTaskSelect';
import type { Group } from './data';

type Point = { group: Group; resource: number; score: number; count: number };
type ResourceTask = { task: string; points: (Point | null)[] };

const halfWidth = 3.8;
const scoreHeight = 2.7;
const depth = 2.8;
const defaultAngle = -32;
const cool = new Color('#00869c');
const warm = new Color('#ef6749');

export function ResourceWaterfall({ tasks, resourceMax, resourceLabel, resourceValue, resourceTick, scoreMax, metric, binary, scoreLabel, onOpenTask }: {
  tasks: ResourceTask[]; resourceMax: number; resourceLabel: string; resourceValue: (value: number) => string;
  resourceTick: (value: number) => string; scoreMax: number; metric: string; binary: boolean; scoreLabel: (value: number) => string;
  onOpenTask: (task: string) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [angle, setAngle] = useState(defaultAngle);
  const [selection, setSelection] = useState('');
  useEffect(() => {
    const target = frame.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const selected = tasks.find(item => item.task === selection);
  const compact = width < 520;
  const height = compact ? 320 : 442;
  const radians = angle * Math.PI / 180;
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(12 * Math.sin(radians), 7.4, 12 * Math.cos(radians));
  camera.lookAt(0, scoreHeight / 2, 0);
  camera.updateMatrixWorld();
  const project = (time: number, score: number, layer: number) => new Vector3(time, score, layer).project(camera);
  const corners = [-halfWidth, halfWidth].flatMap(time => [0, scoreHeight].flatMap(score => [-depth, depth].map(layer => project(time, score, layer))));
  const left = Math.min(...corners.map(point => point.x));
  const right = Math.max(...corners.map(point => point.x));
  const top = Math.max(...corners.map(point => point.y));
  const bottom = Math.min(...corners.map(point => point.y));
  const scale = Math.max(0, Math.min((width - 110) / (right - left), (height - 94) / (top - bottom)));
  const screen = (time: number, score: number, layer: number) => {
    const point = project(time, score, layer);
    return { x: width / 2 + (point.x - (left + right) / 2) * scale, y: (height - 16) / 2 - (point.y - (top + bottom) / 2) * scale };
  };
  const coordinates = (time: number, score: number, layer: number) => {
    const { x, y } = screen(time, score, layer);
    return `${x},${y}`;
  };
  const resourcePosition = (value: number) => -halfWidth + 2 * halfWidth * value / resourceMax;
  const scorePosition = (score: number) => scoreHeight * score / scoreMax;
  const layerPosition = (index: number) => tasks.length === 1 ? 0 : depth * (1 - 2 * index / (tasks.length - 1));
  const ticks = compact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const scoreTicks = binary ? [0, 1] : [0, 0.5, 1];

  return <>
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
      <ChartTaskSelect tasks={tasks.map(item => item.task)} value={selected?.task ?? ''}
        onChange={setSelection} label="高亮题目" allLabel="全部题目" />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: 144, px: 1 }}>
        <Slider size="small" aria-label="立体图视角" min={-65} max={-15} value={angle} onChange={(_, value) => setAngle(value)} />
        <IconButton className="reset-button" size="small" title="重置视角" aria-label="重置视角" onClick={() => setAngle(defaultAngle)}>
          <RotateCcw size={17} />
        </IconButton>
      </Stack>
    </Stack>
    <Box ref={frame} sx={{ minWidth: 0, bgcolor: 'background.neutral', '& [data-task-layer]:is(:hover, :focus-visible) .layer-baseline': { strokeOpacity: 1, strokeWidth: 2 } }}>
      <svg role="group" aria-label={`${tasks.length} 道题的${resourceLabel}与${metric}立体分层图`} width="100%" height={height}
        viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', fontSize: 11 }}>
        <polygon points={[coordinates(-halfWidth, 0, depth), coordinates(halfWidth, 0, depth), coordinates(halfWidth, 0, -depth), coordinates(-halfWidth, 0, -depth)].join(' ')} fill="#eef3f6" stroke="#b9c7d2" />
        {ticks.map(fraction => {
          const value = fraction * resourceMax;
          const position = resourcePosition(value);
          const label = screen(position, 0, depth);
          return <g key={fraction}>
            <polyline points={`${coordinates(position, 0, depth)} ${coordinates(position, 0, -depth)}`} stroke="#c8d3dd" />
            <text x={label.x} y={label.y + 16} textAnchor="middle" fill="#526574">{resourceTick(value)}</text>
          </g>;
        })}
        <polyline points={`${coordinates(-halfWidth, 0, -depth)} ${coordinates(-halfWidth, scoreHeight, -depth)}`} stroke="#8194a3" />
        {scoreTicks.map(fraction => {
          const pos = screen(-halfWidth, fraction * scoreHeight, -depth);
          return <g key={fraction}>
            <polyline points={`${pos.x - 4},${pos.y} ${pos.x},${pos.y} ${coordinates(halfWidth, fraction * scoreHeight, -depth)}`} fill="none" stroke="#b9c7d2" strokeDasharray="3 3" />
            <text x={pos.x - 7} y={pos.y + 4} textAnchor="end" fill="#526574">{scoreLabel(fraction * scoreMax)}</text>
          </g>;
        })}
        {tasks.map((item, index) => ({ item, index })).reverse().map(({ item, index }) => {
          const layer = layerPosition(index);
          const color = `#${cool.clone().lerp(warm, index / Math.max(1, tasks.length - 1)).getHexString()}`;
          const muted = selected && selected.task !== item.task;
          const runs: Point[][] = [[]];
          for (const point of item.points) {
            if (point) runs.at(-1)!.push(point);
            else runs.push([]);
          }
          const label = screen(halfWidth, 0, layer);
          return <g key={item.task} data-task-layer={item.task} opacity={muted ? 0.16 : 1}
            role="button" tabIndex={0} aria-label={`放大 ${item.task}`} aria-haspopup="dialog" style={{ cursor: 'zoom-in' }}
            onClick={() => onOpenTask(item.task)} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenTask(item.task);
              }
            }}>
            <title>{item.task}</title>
            <polyline className="layer-baseline" points={`${coordinates(-halfWidth, 0, layer)} ${coordinates(halfWidth, 0, layer)}`} stroke={color} strokeOpacity={0.28} />
            {runs.filter(run => run.length > 1).map((run, runIndex) => {
              const ordered = [...run].sort((first, last) => first.resource - last.resource);
              const curve = ordered.map(point => coordinates(resourcePosition(point.resource), scorePosition(point.score), layer)).join(' ');
              return <g key={runIndex}>
                <polygon points={`${coordinates(resourcePosition(ordered[0].resource), 0, layer)} ${curve} ${coordinates(resourcePosition(ordered.at(-1)!.resource), 0, layer)}`}
                  fill={color} fillOpacity={0.24} />
                <polyline points={curve} fill="none" stroke={color} strokeWidth={selected?.task === item.task ? 2.6 : 1.5} />
              </g>;
            })}
            {item.points.flatMap(point => {
              if (!point) return [];
              const { x, y } = screen(resourcePosition(point.resource), scorePosition(point.score), layer);
              return <circle key={point.group.key} cx={x} cy={y} r={selected?.task === item.task ? 4.5 : 3}
                fill={point.group.color} stroke="white" strokeWidth={0.7}>
                <title>{item.task} · {point.group.label}：{resourceValue(point.resource)}，{scoreLabel(point.score)}（{point.count} 条）</title>
              </circle>;
            })}
            {(index === 0 || index === tasks.length - 1 || (!compact && index % 5 === 0)) &&
              <text x={label.x + 7} y={label.y + 3} fill="#526574">{item.task.length > 7 ? `${item.task.slice(0, 6)}…` : item.task}</text>}
          </g>;
        })}
        <text x={width / 2} y={height - 12} textAnchor="middle" fill="#455765">{resourceLabel}</text>
        <text x={10} y={18} fill="#455765">{metric}</text>
        <text x={width - 10} y={18} textAnchor="end" fill="#455765">题号</text>
      </svg>
    </Box>
    {selected && <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5, mt: 1, color: 'text.secondary', fontSize: 12 }}>
      {selected.points.flatMap(point => point ? [<span key={point.group.key}><strong style={{ color: point.group.color }}>{point.group.label}</strong>：{resourceValue(point.resource)} · {scoreLabel(point.score)}（{point.count} 条）</span>] : [])}
    </Stack>}
  </>;
}