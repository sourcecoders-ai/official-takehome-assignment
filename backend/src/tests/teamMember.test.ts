import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

describe('Team Member API', () => {
  beforeAll(async () => {
    // Seed test data
    await prisma.teamMember.createMany({
      data: [
        {
          firstName: 'John',
          lastName: 'Doe',
          title: 'Engineer',
          department: 'Engineering',
          status: 'Active',
          startDate: new Date(),
          email: 'john@example.com'
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          title: 'Designer',
          department: 'Design',
          status: 'Remote',
          startDate: new Date(),
          email: 'jane@example.com'
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.teamMember.deleteMany();
    await prisma.$disconnect();
  });

  test('GET /api/team-members with department filter', async () => {
    const res = await request(app)
      .get('/api/team-members')
      .query({ department: 'Engineering' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].department).toEqual('Engineering');
  });

  test('PATCH /api/team-members/:id updates status', async () => {
    const member = await prisma.teamMember.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        title: 'Tester',
        department: 'QA',
        status: 'Active',
        startDate: new Date(),
        email: 'test@example.com'
      }
    });

    const res = await request(app)
      .patch(`/api/team-members/${member.id}`)
      .send({ status: 'On Leave' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('On Leave');

    // Verify persistence
    const updated = await prisma.teamMember.findUnique({
      where: { id: member.id }
    });
    expect(updated?.status).toEqual('On Leave');
  });

  describe('Team Member Skills Filter', () => {
    let skillsList: { id: number }[];
    let member1: { id: number };
    let member2: { id: number };

    beforeAll(async () => {
      // Seed skills
      await prisma.skill.createMany({
        data: [
          { name: 'JavaScript' },
          { name: 'TypeScript' },
          { name: 'React' },
        ],
      });

      skillsList = await prisma.skill.findMany();

      // Seed team members with skills
      member1 = await prisma.teamMember.create({
        data: {
          firstName: 'Skill',
          lastName: 'User1',
          title: 'Tester',
          department: 'QA',
          status: 'Active',
          startDate: new Date(),
          email: 'skill1@example.com',
          skills: {
            create: [
              { skillId: skillsList[0].id },
              { skillId: skillsList[1].id },
              { skillId: skillsList[2].id },
            ],
          },
        },
      });

      member2 = await prisma.teamMember.create({
        data: {
          firstName: 'Skill',
          lastName: 'User2',
          title: 'Tester',
          department: 'QA',
          status: 'Active',
          startDate: new Date(),
          email: 'skill2@example.com',
          skills: {
            create: [
              { skillId: skillsList[0].id },
            ],
          },
        },
      });
    });

    afterAll(async () => {
      await prisma.teamMemberSkill.deleteMany();
      await prisma.skill.deleteMany();
      await prisma.teamMember.deleteMany();
    });

    it('should return members with ALL specified skills', async () => {
      const res = await request(app)
        .get('/api/team-members')
        .query({ skills: `${skillsList[0].id},${skillsList[1].id}` });

      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toEqual(1);
      expect(res.body[0].id).toEqual(member1.id);
    });

    it('should return empty array when no members have all skills', async () => {
      const res = await request(app)
        .get('/api/team-members')
        .query({ skills: `${skillsList[0].id},${skillsList[1].id},${skillsList[2].id}` });

      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toEqual(1);
      expect(res.body[0].id).toEqual(member1.id);
    });

    it('should return all members when no skills filter is provided', async () => {
      const res = await request(app)
        .get('/api/team-members');

      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Status Update Handler', () => {
    it('should handle concurrent status updates correctly', async () => {
      const member = await prisma.teamMember.create({
        data: {
          firstName: 'Concurrent',
          lastName: 'User',
          title: 'Tester',
          department: 'QA',
          status: 'Active',
          startDate: new Date(),
          email: 'concurrent@example.com',
        },
      });

      const status1 = 'On Leave';
      const status2 = 'Active';

      const update1 = request(app)
        .patch(`/api/team-members/${member.id}`)
        .send({ status: status1 });

      const update2 = request(app)
        .patch(`/api/team-members/${member.id}`)
        .send({ status: status2 });

      await Promise.all([update1, update2]);

      const updated = await prisma.teamMember.findUnique({
        where: { id: member.id },
      });

      expect(updated?.status).toBe(status2);
    });
  });

  describe('Department Filter Performance', () => {
    it('should return results within 200ms', async () => {
      const startTime = Date.now();
      const res = await request(app)
        .get('/api/team-members')
        .query({ department: 'Engineering' });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(res.statusCode).toEqual(200);
      expect(duration).toBeLessThan(200);
    });
  });
});
