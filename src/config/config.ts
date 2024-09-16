import * as dotenv from "dotenv";


export function loadEnv() {
    dotenv.config();

    const orgUrl = process.env.ORG_URL;
    const project = process.env.PROJECT;
    const sprintName = process.env.SPRINT_ITER;
    const token = process.env.AZURE_PERSONAL_ACCESS_TOKEN;

    if (!orgUrl || !project || !sprintName || !token) {
        throw new Error("Required environment variables are missing");
    }

    return { orgUrl, project, sprintName, token };
}
