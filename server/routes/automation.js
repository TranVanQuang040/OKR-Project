import express from 'express';
import OKRTemplate from '../models/OKRTemplate.js';
import Objective from '../models/Objective.js';
import authMiddleware from '../middleware/auth.js';
import {
    generateCompanyOKRs,
    cascadeToDepartments,
    cascadeToTeams
} from '../services/okrAutomation.js';
import { clearCacheByPattern, dashboardCache, heatmapCache } from '../utils/cache.js';

import KPI from '../models/KPI.js';
import Task from '../models/Task.js';
import MyObjective from '../models/MyObjective.js';

const router = express.Router();

// Cleanup / Reset Data (Delete all operational data)
router.post('/cleanup', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin only' });
        }

        await Promise.all([
            Objective.deleteMany({}),
            KPI.deleteMany({}),
            Task.deleteMany({}),
            MyObjective.deleteMany({})
        ]);

        clearCacheByPattern(dashboardCache, '');
        clearCacheByPattern(heatmapCache, '');

        res.json({ message: 'All operational data cleared successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Cleanup failed', error: err.message });
    }
});

// Get all templates
router.get('/templates', authMiddleware, async (req, res) => {
    try {
        const { type, industry, category } = req.query;
        const filter = { isActive: true };

        if (type) filter.type = type;
        if (industry) filter.industry = industry;
        if (category) filter.category = category;

        const templates = await OKRTemplate.find(filter).sort({ createdAt: -1 });
        res.json(templates);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create template (Admin only)
router.post('/templates', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin only' });
        }

        const template = await OKRTemplate.create(req.body);
        res.json(template);
    } catch (err) {
        res.status(400).json({ message: 'Invalid data', error: err.message });
    }
});

// Generate Company OKRs from templates
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { quarter, year, templateIds } = req.body;

        if (!quarter || !year || !templateIds || !Array.isArray(templateIds)) {
            return res.status(400).json({ message: 'Missing required fields: quarter, year, templateIds' });
        }

        const createdBy = {
            id: req.user.id,
            name: req.user.name
        };

        const companyOKRs = await generateCompanyOKRs({
            quarter,
            year,
            templateIds,
            createdBy,
            overrides: req.body.overrides || {}
        });

        // Clear cache
        clearCacheByPattern(dashboardCache, '');
        clearCacheByPattern(heatmapCache, '');

        res.json({
            message: `Generated ${companyOKRs.length} company OKRs`,
            okrs: companyOKRs
        });
    } catch (err) {
        res.status(400).json({ message: 'Generation failed', error: err.message });
    }
});

// Cascade Company OKR to Departments
router.post('/cascade/departments/:companyOkrId', authMiddleware, async (req, res) => {
    try {
        const deptOKRs = await cascadeToDepartments(req.params.companyOkrId);

        clearCacheByPattern(dashboardCache, '');
        clearCacheByPattern(heatmapCache, '');

        res.json({
            message: `Created ${deptOKRs.length} department OKRs`,
            okrs: deptOKRs
        });
    } catch (err) {
        res.status(400).json({ message: 'Cascade failed', error: err.message });
    }
});

// Cascade Department OKR to Teams
router.post('/cascade/teams/:deptOkrId', authMiddleware, async (req, res) => {
    try {
        const teamOKRs = await cascadeToTeams(req.params.deptOkrId);

        clearCacheByPattern(dashboardCache, '');
        clearCacheByPattern(heatmapCache, '');

        res.json({
            message: `Created ${teamOKRs.length} team OKRs`,
            okrs: teamOKRs
        });
    } catch (err) {
        res.status(400).json({ message: 'Cascade failed', error: err.message });
    }
});

// Full automation workflow
router.post('/workflow', authMiddleware, async (req, res) => {
    try {
        const { quarter, year, templateIds, cascadeToDept, cascadeToTeam, overrides } = req.body;

        if (!quarter || !year || !templateIds) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const results = {
            companyOKRs: [],
            departmentOKRs: [],
            teamOKRs: []
        };

        // Step 1: Generate Company OKRs
        const createdBy = { id: req.user.id, name: req.user.name };
        results.companyOKRs = await generateCompanyOKRs({
            quarter,
            year,
            templateIds,
            createdBy,
            overrides: overrides || {}
        });

        // Step 2: Cascade to Departments (if requested)
        if (cascadeToDept) {
            for (const companyOkr of results.companyOKRs) {
                const deptOKRs = await cascadeToDepartments(companyOkr._id);
                results.departmentOKRs.push(...deptOKRs);
            }
        }

        // Step 3: Cascade to Teams (if requested)
        if (cascadeToTeam && results.departmentOKRs.length > 0) {
            for (const deptOkr of results.departmentOKRs) {
                const teamOKRs = await cascadeToTeams(deptOkr._id);
                results.teamOKRs.push(...teamOKRs);
            }
        }

        clearCacheByPattern(dashboardCache, '');
        clearCacheByPattern(heatmapCache, '');

        res.json({
            message: 'Automation workflow completed',
            summary: {
                company: results.companyOKRs.length,
                department: results.departmentOKRs.length,
                team: results.teamOKRs.length
            },
            results
        });
    } catch (err) {
        res.status(500).json({ message: 'Workflow failed', error: err.message });
    }
});

// Preview generated OKRs (dry run)
router.post('/preview', authMiddleware, async (req, res) => {
    try {
        const { templateIds } = req.body;

        if (!templateIds || !Array.isArray(templateIds)) {
            return res.status(400).json({ message: 'templateIds is required' });
        }

        const templates = await OKRTemplate.find({
            _id: { $in: templateIds },
            type: 'COMPANY',
            isActive: true
        });

        res.json({
            count: templates.length,
            templates: templates.map(t => ({
                id: t._id,
                title: t.title,
                category: t.category,
                keyResultsCount: t.suggestedKRs.length
            }))
        });
    } catch (err) {
        res.status(500).json({ message: 'Preview failed', error: err.message });
    }
});

export default router;
