import * as azdev from "azure-devops-node-api";
import * as wi from "azure-devops-node-api/WorkItemTrackingApi";
import * as witm from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import * as CoreApi from 'azure-devops-node-api/CoreApi';
import * as CoreInterfaces from 'azure-devops-node-api/interfaces/CoreInterfaces';
import * as dotenv from "dotenv";

dotenv.config();

process.env.DEBUG = "azure-devops-node-api:*";

async function run() {
    try {
        const orgUrl: string = process.env.ORG_URL as string;
        const project: string = process.env.PROJECT as string;
        const sprintName: string = process.env.SPRINT_ITER as string;
        const token: string = process.env.AZURE_PERSONAL_ACCESS_TOKEN as string;
        const authHandler = azdev.getPersonalAccessTokenHandler(token);
        const connection = new azdev.WebApi(orgUrl, authHandler);

        // Get an instance of the Work Item Tracking API
        const workItemApi: wi.IWorkItemTrackingApi = await connection.getWorkItemTrackingApi();

        // console.log('Work data in progress', await workItemApi.getAccountMyWorkData(witm.QueryOption.Doing));
        const coreApiObject: CoreApi.CoreApi = await connection.getCoreApi();
        const project_data: CoreInterfaces.TeamProject = await coreApiObject.getProject(project);
        const teamContext = {project: project_data.name, 
                             projectId: project_data.id, 
                             team: project_data.defaultTeam?.name, 
                             teamId: project_data.defaultTeam?.id};

        // Define a Wiql query to fetch work items for the specific sprint
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

        if (queryResult.workItems && queryResult.workItems.length > 0) {
            const ids = queryResult.workItems.map(item => item?.id).filter(id => id !== undefined) as number[];
            const workItems = await workItemApi.getWorkItems(ids);

            // workItems.forEach(item => {
            //     console.log(`ID: ${item?.id}, Title: ${item?.fields?.["System.Title"]}, State: ${item?.fields?.["System.State"]}`);
            // });

            const pbis = queryResult.workItems;
            if (pbis && pbis.length > 0) {
                for (const pbiRef of pbis) {
                    const pbiId = pbiRef.id;
            
                    // Fetch full details of the PBI
                    const pbiDetails = await workItemApi.getWorkItem(pbiId);
                    const pbiName = pbiDetails.fields["System.Title"];
                    const pbiEffort = pbiDetails.fields["Microsoft.VSTS.Scheduling.Effort"];
                    const pbiAssignedTo = pbiDetails.fields["System.AssignedTo"]?.displayName || "Unassigned";

            
                    // Get the state of the PBI
                    const pbiStatus = pbiDetails.fields["System.State"];
            
                    // Query to get child tasks for this PBI
                    const childTasksQuery: witm.Wiql = {
                        query: `
                            SELECT [System.Id]
                            FROM WorkItems
                            WHERE [System.TeamProject] = '${project}'
                            AND [System.WorkItemType] = 'Task'
                            AND [System.Parent] = ${pbiId}
                        `
                    };
            
                    const childTasksResult = await workItemApi.queryByWiql(childTasksQuery, teamContext);
            
                    if (childTasksResult.workItems && childTasksResult.workItems.length > 0) {
                        const taskIds = childTasksResult.workItems.map(taskRef => taskRef.id);
            
                        // Fetch full details of the child tasks
                        const childTasks = await workItemApi.getWorkItems(taskIds);
            
                        // Get the states of the child tasks
                        const childTaskStates = childTasks.map(task => task.fields["System.State"]);
            
                        // Determine the final status
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
            
                        console.log(`PBI Name: ${pbiName}, Effort: ${pbiEffort || 'N/A'}, Assigned To: ${pbiAssignedTo}, Final Status: ${finalStatus}`);
                    } else {
                        console.log(`PBI ID: ${pbiId} has no child tasks.`);
                    }
                }
            } else {
                console.log("No PBIs found.");
            }
        } else {
            console.log(`No work items found for ${sprintName}.`);
        }
    } catch (err) {
        console.error("Error fetching work items: ", err);
    }
}

run();
