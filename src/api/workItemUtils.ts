import * as witm from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import * as wi from "azure-devops-node-api/WorkItemTrackingApi";


export async function fetchPBIs(workItemApi: wi.IWorkItemTrackingApi, project: string, sprintName: string) {
    const wiqlQuery: witm.Wiql = {
        query: `
            SELECT [System.Id], [System.Title], [System.State]
            FROM WorkItems
            WHERE [System.TeamProject] = '${project}'
            AND [System.IterationPath] = '${project}\\${sprintName}'
            AND [System.WorkItemType] = 'Product Backlog Item'
            ORDER BY [System.Id]
        `
    };

    const queryResult = await workItemApi.queryByWiql(wiqlQuery);
    return queryResult.workItems;
}


export async function fetchChildTasks(workItemApi: wi.IWorkItemTrackingApi, project: string, pbiId: number) {
  const childTasksQuery: witm.Wiql = {
      query: `
          SELECT [System.Id]
          FROM WorkItems
          WHERE [System.TeamProject] = '${project}'
          AND [System.WorkItemType] = 'Task'
          AND [System.Parent] = ${pbiId}
      `
  };

  const childTasksResult = await workItemApi.queryByWiql(childTasksQuery);
  return childTasksResult.workItems;
}


export function determineFinalStatus(pbiStatus: string, childTaskStates: string[]): string {
  let finalStatus = '';

  if (pbiStatus === 'Committed') {
      if (childTaskStates.every(state => state === 'Done')) {
          finalStatus = 'Test';
      } else if (childTaskStates.every(state => state === 'In Progress')) {
          finalStatus = 'InProgress';
      } else if (childTaskStates.every(state => state === 'To Do')) {
          finalStatus = 'ToDo';
      } else {
          finalStatus = 'InProgress';
      }
  } else if (pbiStatus === 'Done' && childTaskStates.every(state => state === 'Done')) {
      finalStatus = 'Done';
  }

  return finalStatus;
}
