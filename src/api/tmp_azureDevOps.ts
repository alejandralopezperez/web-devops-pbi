import * as azdev from "azure-devops-node-api";
import * as wi from "azure-devops-node-api/WorkItemTrackingApi";
import * as CoreApi from 'azure-devops-node-api/CoreApi';


async function connectToAzureDevOps(orgUrl: string, token: string) {
    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    const connection = new azdev.WebApi(orgUrl, authHandler);

    const workItemApi = await connection.getWorkItemTrackingApi();
    const coreApi = await connection.getCoreApi();

    return { workItemApi, coreApi };
}


async function getProjectData(coreApi: CoreApi.CoreApi, projectName: string) {
  const projectData = await coreApi.getProject(projectName);
  return projectData;
}


import * as witm from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";

async function fetchPBIs(workItemApi: wi.IWorkItemTrackingApi, project: string, sprintName: string) {
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


async function fetchChildTasks(workItemApi: wi.IWorkItemTrackingApi, project: string, pbiId: number) {
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


function determineFinalStatus(pbiStatus: string, childTaskStates: string[]) {
  let finalStatus = '';

  if (pbiStatus === 'Committed') {
      if (childTaskStates.every(state => state === 'Done')) {
          finalStatus = 'Test';
      } else if (childTaskStates.every(state => state === 'In Progress')) {
          finalStatus = 'InProgress';
      } else if (childTaskStates.every(state => state === 'To Do')) {
          finalStatus = 'ToDo';
      } else {
          finalStatus = 'InProgress'; // Mixed states default to InProgress
      }
  } else if (pbiStatus === 'Done' && childTaskStates.every(state => state === 'Done')) {
      finalStatus = 'Done';
  }

  return finalStatus;
}


async function gatherSprintData(orgUrl: string, token: string, project: string, sprintName: string) {
  const { workItemApi, coreApi } = await connectToAzureDevOps(orgUrl, token);
  const projectData = await getProjectData(coreApi, project);

  const pbis = await fetchPBIs(workItemApi, project, sprintName);

  const sprintData = {
      projectName: projectData.name,
      sprintName,
      tasks: []
  };

  for (const pbiRef of pbis) {
      const pbiDetails = await workItemApi.getWorkItem(pbiRef.id);
      const pbiName = pbiDetails.fields["System.Title"];
      const pbiEffort = pbiDetails.fields["Microsoft.VSTS.Scheduling.Effort"];
      const pbiAssignedTo = pbiDetails.fields["System.AssignedTo"]?.displayName || "Unassigned";
      const pbiStatus = pbiDetails.fields["System.State"];

      const childTasksRefs = await fetchChildTasks(workItemApi, project, pbiRef.id);

      if (childTasksRefs.length > 0) {
          const taskIds = childTasksRefs.map(taskRef => taskRef.id);
          const childTasks = await workItemApi.getWorkItems(taskIds);
          const childTaskStates = childTasks.map(task => task.fields["System.State"]);

          const finalStatus = determineFinalStatus(pbiStatus, childTaskStates);

          sprintData.tasks.push({
              pbiName,
              effort: pbiEffort || 'N/A',
              assignedTo: pbiAssignedTo,
              status: finalStatus
          });
      }
  }

  return sprintData;
}


import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const orgUrl = process.env.ORG_URL as string;
  const project = process.env.PROJECT as string;
  const sprintName = process.env.SPRINT_ITER as string;
  const token = process.env.AZURE_PERSONAL_ACCESS_TOKEN as string;

  const sprintData = await gatherSprintData(orgUrl, token, project, sprintName);

  console.log(sprintData);

  // Now you can send `sprintData` to the web or another service as needed.
}

run();
