import { Router } from 'express';
import { gatherSprintData } from '../api/sprintData';
import { loadEnv } from '../config/config';


const router = Router();

router.get('/api/sprint-data', async (req, res) => {
    const { orgUrl, project, sprintName, token } = loadEnv();

    try {
        const sprintData = await gatherSprintData(orgUrl, token, project, sprintName);
        res.json(sprintData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sprint data' });
    }
});

export default router;
