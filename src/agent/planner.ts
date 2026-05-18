export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export interface Task {
  id: number;
  content: string;
  status: TaskStatus;
}

export class Planner {
  private tasks: Task[] = [];
  private nextId = 1;

  createPlan(items: string[]): Task[] {
    this.tasks = items.map(content => ({
      id: this.nextId++,
      content,
      status: 'pending' as TaskStatus,
    }));
    return [...this.tasks];
  }

  updateTask(id: number, status: TaskStatus): Task | null {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    task.status = status;
    return task;
  }

  formatForLLM(): string {
    if (this.tasks.length === 0) {
      return '(无计划)';
    }
    return this.tasks.map(t => {
      const mark = t.status === 'done' ? '✓' : t.status === 'in_progress' ? '→' : t.status === 'cancelled' ? '✗' : '○';
      return `${mark} [${t.id}] ${t.content}`;
    }).join('\n');
  }
}