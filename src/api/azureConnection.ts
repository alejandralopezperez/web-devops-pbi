import * as azdev from "azure-devops-node-api";


export async function connectToAzureDevOps(orgUrl: string, token: string) {
    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    const connection = new azdev.WebApi(orgUrl, authHandler);

    const workItemApi = await connection.getWorkItemTrackingApi();
    const coreApi = await connection.getCoreApi();

    return { workItemApi, coreApi };
}
