import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query } from 'express-validator';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Rate limiting for team member routes
import rateLimit from 'express-rate-limit';
const teamMemberLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit to 30 requests per minute
  message: 'Too many requests to team members endpoint, please try again later'
});

// GET /api/team-members
router.get('/', teamMemberLimiter, async (req, res, next) => {
  try {
    const { department, status, skills } = req.query;
    
    let skillIds: number[] = [];
    if (typeof skills === 'string') {
      skillIds = skills.split(',').map(Number);
    }

    const teamMembersRaw = await prisma.teamMember.findMany({
      where: {
        ...(department && { department: { equals: String(department), mode: 'insensitive' } }),
        ...(status && { status: String(status) }),
        ...(skillIds.length > 0 && {
          skills: {
            some: {
              skillId: { in: skillIds },
            },
          }
        }),
      },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    // Filter to only those who have all skillIds
    const teamMembers = skillIds.length > 0
      ? teamMembersRaw.filter(tm => {
          const memberSkillIds = tm.skills.map(s => s.skillId);
          return skillIds.every(id => memberSkillIds.includes(id));
        })
      : teamMembersRaw;

    console.log('Found team members:', teamMembers);

    res.json(teamMembers);
  } catch (error) {
    next(error);
  }
});

// GET /api/team-members/:id
router.get('/:id', async (req, res, next) => {
  try {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!teamMember) {
      throw new AppError(404, 'Team member not found');
    }

    res.json(teamMember);
  } catch (error) {
    next(error);
  }
});

// POST /api/team-members
router.post('/', async (req, res, next) => {
  try {
    const { skills = [], firstName, lastName, email, department, status, title, startDate } = req.body;
    
    console.log('Creating team member with data:', {
      firstName, lastName, email, department, status, title, startDate,
      skillIds: skills
    });


    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'department', 'status', 'title', 'startDate'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      throw new AppError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        firstName,
        lastName,
        email,
        department,
        status,
        title,
        startDate: new Date(startDate),
        ...(skills.length > 0 && {
          skills: {
            create: skills.map((skillId: number) => ({
              skill: { connect: { id: skillId } }
            }))
          }
        })
      },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });


    console.log('Successfully created team member:', teamMember);
    res.status(201).json(teamMember);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/team-members/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { skills = [], firstName, lastName, email, department, status, title } = req.body;
    const id = Number(req.params.id);

    // Validate at least one field is provided
    if (!firstName && !lastName && !email && !department && !status && !skills) {
      throw new AppError(400, 'At least one field must be provided for update');
    }

    const teamMember = await prisma.teamMember.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(department && { department }),
        ...(status && { status }),
        ...(title && { title }),
        ...(skills.length > 0 && {
          skills: {
            deleteMany: {},
            create: skills.map((skillId: number) => ({
              skill: { connect: { id: skillId } },
            })),
          },
        }),
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!teamMember) {
      throw new AppError(404, 'Team member not found');
    }

    res.json(teamMember);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('PrismaClientKnownRequestError')) {
        next(new AppError(409, 'Conflict: Status update failed due to concurrent modification.'));
      } else {
        next(error);
      }
    } else {
      next(new AppError(500, 'Unknown error occurred'));
    }
  }
});

// DELETE /api/team-members/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.teamMember.delete({
      where: { id: Number(req.params.id) }
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export const teamMemberRouter = router;
