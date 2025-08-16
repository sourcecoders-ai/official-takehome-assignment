import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import cors from 'cors';

const router = express.Router();
const prisma = new PrismaClient();
router.use(cors());

// GET /api/skills
router.get('/', async (req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

// POST /api/skills
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError(400, 'Skill name is required and must be a non-empty string');
    }

    const trimmedName = name.trim();
    
    // Try to find or create the skill
    const existingSkill = await prisma.skill.findUnique({
      where: { name: trimmedName }
    });

    const skill = await prisma.skill.upsert({
      where: { name: trimmedName },
      update: {}, // No updates if exists
      create: { name: trimmedName }
    });

    res.status(201).json({
      message: existingSkill ? 'Skill already exists' : 'Skill created',
      skill
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/skills/seed
router.post('/seed', async (req, res, next) => {
  try {
    const defaultSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js'];

    // Get existing skills first
    const existingSkills = await prisma.skill.findMany({
      where: {
        name: { in: defaultSkills }
      }
    });

    // Filter out skills that already exist
    const newSkills = defaultSkills.filter(name => 
      !existingSkills.some(skill => skill.name === name)
    );

    // Create only new skills
    const createdSkills = await Promise.all(
      newSkills.map(name =>
        prisma.skill.create({
          data: { name }
        })
      )
    );

    // Combine existing and new skills
    const allSkills = [...existingSkills, ...createdSkills];
    
    res.status(201).json({
      message: 'Skills seeded successfully',
      created: createdSkills.length,
      existing: existingSkills.length,
      skills: allSkills
    });
  } catch (error) {
    next(error);
  }
});

export const skillRouter = router;
