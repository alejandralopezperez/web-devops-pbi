import React, { useEffect, useState } from 'react';

interface Task {
  pbiName: string;
  effort: string | number;
  assignedTo: string;
  status: 'ToDo' | 'InProgress' | 'Test' | 'Done';
}

interface SprintData {
  projectName: string;
  sprintName: string;
  tasks: Task[];
}

function App() {
  const [sprintData, setSprintData] = useState<SprintData | null>(null);

  useEffect(() => {
    async function fetchSprintData() {
      try {
        const response = await fetch('/api/sprint-data');
        if (!response.ok) throw new Error('Failed to fetch sprint data');
        const data: SprintData = await response.json();
        setSprintData(data);
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchSprintData();
  }, []);

  if (!sprintData) return <p>Loading...</p>;

  const statusColumns: { [key: string]: Task[] } = {
    ToDo: [],
    InProgress: [],
    Test: [],
    Done: [],
  };

  sprintData.tasks.forEach(task => {
    statusColumns[task.status].push(task);
  });

  return (
    <div className="app">
      <h1 className="project-title">{sprintData.projectName}</h1>
      <h2 className="sprint-name">{sprintData.sprintName}</h2>
      <div className="task-container">
        {Object.keys(statusColumns).map(status => (
          <div key={status} className="task-column">
            <h3>{status}</h3>
            {statusColumns[status].map(task => (
              <div key={task.pbiName} className="task-item">
                <span className="task-name">{task.pbiName}</span>
                <span className="task-details">
                  <span className="task-assigned-to">({task.assignedTo})</span>
                  <span className="task-effort">{task.effort}h</span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
