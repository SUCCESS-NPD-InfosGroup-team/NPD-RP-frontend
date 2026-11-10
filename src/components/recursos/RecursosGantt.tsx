import 'gantt-task-react/dist/index.css';
import { Gantt, ViewMode } from 'gantt-task-react';
import type { Recurso } from '../../types';

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  project?: string;
  displayOrder?: number;
  styles?: {
    backgroundColor?: string;
    backgroundSelectedColor?: string;
    progressColor?: string;
    progressSelectedColor?: string;
  };
}

const COLORS = ['#FED7AA', '#BFDBFE', '#FBCFE8', '#BBF7D0', '#DDD6FE', '#FDE68A'];

export const RecursosGantt = ({ recursos }: { recursos: Recurso[] }) => {
  const tasks: GanttTask[] = recursos.map((recurso, index) => ({
    id: recurso.id,
    name: `${recurso.nombre} (${recurso.nEmpleado})`,
    start: new Date(recurso.fechaInicio),
    end: new Date(recurso.fechaFin),
    progress: 50,
    dependencies: [],
    project: `${recurso.cliente} — ${recurso.proyecto}`,
    displayOrder: index,
    styles: {
      backgroundColor: COLORS[index % COLORS.length],
      backgroundSelectedColor: '#E85D04',
      progressColor: '#E85D04',
      progressSelectedColor: '#C44E03',
    },
  }));

  if (tasks.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No hay recursos para mostrar en el Gantt</div>;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', overflow: 'auto' }}>
      <Gantt tasks={tasks as unknown as never} viewMode={ViewMode.Month} listCellWidth="180px" columnWidth={90} barCornerRadius={3} fontSize="10px" rowHeight={32} headerHeight={45} barFill={60} todayColor="rgba(232, 93, 4, 0.08)" locale="en-US" />
    </div>
  );
};