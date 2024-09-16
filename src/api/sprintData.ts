import { connectToAzureDevOps } from './azureConnection';
import { fetchPBIs, fetchChildTasks, determineFinalStatus } from './workItemUtils';
import * as CoreApi from 'azure-devops-node-api/CoreApi';


interface Task {
    pbiName: string;
    effort: string | number;
    assignedTo: string;
    status: string;
}

interface SprintData {
    projectName: string;
    sprintName: string;
    tasks: Task[];
}


export async function gatherSprintData(orgUrl: string, token: string, project: string, sprintName: string) {
    const { workItemApi, coreApi } = await connectToAzureDevOps(orgUrl, token);
    const projectData = await getProjectData(coreApi, project);

    const pbis = await fetchPBIs(workItemApi, project, sprintName);

    const sprintData: SprintData = {
        projectName: projectData.name || "Unnamed Project",
        sprintName,
        tasks: []
    };

    for (const pbiRef of pbis || []) {
        const pbiId = pbiRef?.id;
        if (pbiId) {
            const pbiDetails = await workItemApi.getWorkItem(pbiId);
            const pbiName = pbiDetails?.fields?.["System.Title"];
            const pbiEffort = pbiDetails?.fields?.["Microsoft.VSTS.Scheduling.Effort"];
            const pbiAssignedTo = pbiDetails?.fields?.["System.AssignedTo"]?.displayName || "Unassigned";
            const pbiStatus = pbiDetails?.fields?.["System.State"];

            const childTasksRefs = await fetchChildTasks(workItemApi, project, pbiId);

            if (childTasksRefs && childTasksRefs.length > 0) {
                const taskIds = childTasksRefs.map(taskRef => taskRef?.id).filter(id => id !== undefined);

                if (taskIds.length > 0) {
                    const childTasks = await workItemApi.getWorkItems(taskIds);
                    const childTaskStates = childTasks.map(task => task?.fields?.["System.State"] || "");

                    const finalStatus = determineFinalStatus(pbiStatus || "", childTaskStates);

                    sprintData.tasks.push({
                        pbiName: pbiName || "Unnamed PBI",
                        effort: pbiEffort || 'N/A',
                        assignedTo: pbiAssignedTo,
                        status: finalStatus
                    });
                }
            }
        }
    }

    return sprintData;
}


async function getProjectData(coreApi: CoreApi.CoreApi, projectName: string) {
    const projectData = await coreApi.getProject(projectName);
    return projectData;
}
