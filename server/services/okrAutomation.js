import Objective from '../models/Objective.js';
import OKRTemplate from '../models/OKRTemplate.js';
import Department from '../models/Department.js';
import User from '../models/User.js';
import Workgroup from '../models/Workgroup.js';

/**
 * Generate Company OKRs from selected templates
 * @param {Object} params - { cycleId, quarter, year, templateIds, createdBy, overrides }
 * @returns {Promise<Array>} Created company OKRs
 */
export async function generateCompanyOKRs({ quarter, year, templateIds, createdBy, overrides = {} }) {
    const templates = await OKRTemplate.find({
        _id: { $in: templateIds },
        type: 'COMPANY'
    });

    if (!templates.length) {
        throw new Error('No valid company templates found');
    }

    const createdOKRs = [];

    for (const template of templates) {
        // Apply overrides if any
        const override = overrides[template._id] || {};
        const title = override.title || template.title;
        const description = override.description || template.description;

        // Use overridden KRs if provided, otherwise use template KRs
        const sourceKRs = override.keyResults || template.suggestedKRs;

        const keyResults = sourceKRs.map(kr => ({
            title: kr.title,
            unit: kr.unit || '%',
            targetValue: kr.targetValue || 100,
            currentValue: 0,
            progress: 0,
            source: 'MANUAL',
            weight: kr.weight || 1,
            confidenceScore: 10
        }));

        const okr = await Objective.create({
            title,
            description,
            type: 'COMPANY',
            priority: template.priority,
            tags: template.tags,
            quarter,
            year: Number(year),
            ownerId: createdBy.id,
            ownerName: createdBy.name,
            department: 'Company',
            status: 'DRAFT',
            keyResults,
            startDate: new Date(`${year}-${getQuarterStartMonth(quarter)}-01`),
            endDate: new Date(`${year}-${getQuarterEndMonth(quarter)}-30`)
        });

        createdOKRs.push(okr);
    }

    return createdOKRs;
}

/**
 * Cascade Company OKRs to Department level
 * @param {String} companyOkrId - Company OKR ID
 * @returns {Promise<Array>} Created department OKRs
 */
export async function cascadeToDepartments(companyOkrId) {
    const companyOkr = await Objective.findById(companyOkrId);
    if (!companyOkr || companyOkr.type !== 'COMPANY') {
        throw new Error('Invalid company OKR');
    }

    // Get all departments
    const departments = await Department.find({});
    const createdOKRs = [];

    for (const dept of departments) {
        // Find department head
        const deptHead = await User.findOne({ department: dept.name, role: 'MANAGER' });
        if (!deptHead) continue;

        // Create scaled-down version of company OKR for each department
        const keyResults = companyOkr.keyResults.map(kr => ({
            title: `${dept.name}: ${kr.title}`,
            unit: kr.unit,
            targetValue: Math.round(kr.targetValue * 0.7), // 70% of company target
            currentValue: 0,
            progress: 0,
            source: 'MANUAL',
            weight: kr.weight,
            confidenceScore: 10
        }));

        const deptOkr = await Objective.create({
            title: `${dept.name}: ${companyOkr.title}`,
            description: companyOkr.description,
            type: 'DEPARTMENT',
            parentId: companyOkr._id,
            priority: companyOkr.priority,
            tags: companyOkr.tags,
            quarter: companyOkr.quarter,
            year: companyOkr.year,
            ownerId: deptHead._id.toString(),
            ownerName: deptHead.name,
            department: dept.name,
            status: 'DRAFT',
            keyResults,
            startDate: companyOkr.startDate,
            endDate: companyOkr.endDate
        });

        createdOKRs.push(deptOkr);
    }

    return createdOKRs;
}

/**
 * Cascade Department OKRs to Team level
 * @param {String} deptOkrId - Department OKR ID
 * @returns {Promise<Array>} Created team OKRs
 */
export async function cascadeToTeams(deptOkrId) {
    const deptOkr = await Objective.findById(deptOkrId);
    if (!deptOkr || deptOkr.type !== 'DEPARTMENT') {
        throw new Error('Invalid department OKR');
    }

    // Find workgroups in this department
    const deptUsers = await User.find({ department: deptOkr.department });
    const userIds = deptUsers.map(u => u._id);
    const workgroups = await Workgroup.find({ leaderId: { $in: userIds } });

    const createdOKRs = [];

    for (const workgroup of workgroups) {
        const leader = await User.findById(workgroup.leaderId);
        if (!leader) continue;

        const keyResults = deptOkr.keyResults.map(kr => ({
            title: `${workgroup.name}: ${kr.title}`,
            unit: kr.unit,
            targetValue: Math.round(kr.targetValue * 0.6), // 60% of dept target
            currentValue: 0,
            progress: 0,
            source: 'MANUAL',
            weight: kr.weight,
            confidenceScore: 10
        }));

        const teamOkr = await Objective.create({
            title: `${workgroup.name}: ${deptOkr.title}`,
            description: deptOkr.description,
            type: 'TEAM',
            parentId: deptOkr._id,
            workgroupId: workgroup._id,
            priority: deptOkr.priority,
            tags: deptOkr.tags,
            quarter: deptOkr.quarter,
            year: deptOkr.year,
            ownerId: leader._id.toString(),
            ownerName: leader.name,
            department: deptOkr.department,
            status: 'DRAFT',
            keyResults,
            startDate: deptOkr.startDate,
            endDate: deptOkr.endDate
        });

        createdOKRs.push(teamOkr);
    }

    return createdOKRs;
}

/**
 * Auto-align OKRs by finding best parent match
 * @param {String} okrId - OKR to align
 * @returns {Promise<Object>} Updated OKR with parentId
 */
export async function autoAlign(okrId) {
    const okr = await Objective.findById(okrId);
    if (!okr || okr.parentId) {
        return okr; // Already aligned
    }

    // Find potential parents (same quarter/year, one level up)
    const parentType = getParentType(okr.type);
    if (!parentType) return okr;

    const potentialParents = await Objective.find({
        type: parentType,
        quarter: okr.quarter,
        year: okr.year,
        department: okr.type === 'DEPARTMENT' ? 'Company' : okr.department
    });

    if (!potentialParents.length) return okr;

    // Simple matching: pick first one (can be enhanced with similarity)
    okr.parentId = potentialParents[0]._id;
    await okr.save();

    return okr;
}

// Helper functions
function getQuarterStartMonth(quarter) {
    const map = { Q1: '01', Q2: '04', Q3: '07', Q4: '10' };
    return map[quarter] || '01';
}

function getQuarterEndMonth(quarter) {
    const map = { Q1: '03', Q2: '06', Q3: '09', Q4: '12' };
    return map[quarter] || '12';
}

function getParentType(type) {
    const hierarchy = {
        'PERSONAL': 'TEAM',
        'TEAM': 'DEPARTMENT',
        'DEPARTMENT': 'COMPANY'
    };
    return hierarchy[type] || null;
}

export default {
    generateCompanyOKRs,
    cascadeToDepartments,
    cascadeToTeams,
    autoAlign
};
