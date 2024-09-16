import { loadEnv } from './config/config';
import { gatherSprintData } from './api/sprintData';


async function run() {
    const { orgUrl, project, sprintName, token } = loadEnv();

    const sprintData = await gatherSprintData(orgUrl, token, project, sprintName);

    console.log(sprintData);

    // Here you can send `sprintData` to the web or another service as needed.
}

run();
