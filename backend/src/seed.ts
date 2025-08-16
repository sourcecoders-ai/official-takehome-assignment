import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
        dotenv.config();
const prisma = new PrismaClient();

async function seed() {
  console.log('Starting seed...');

  // Create default skills
  const defaultSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL'];
  
  console.log('Creating default skills...');
  const skills = await Promise.all(
    defaultSkills.map(name => 
      prisma.skill.create({
        data: { name }
      })
    )
  );
  console.log('Created skills:', skills);

  // Create some sample team members
  console.log('Creating sample team members...');
  const teamMembers = await Promise.all([
    prisma.teamMember.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        department: 'Engineering',
        status: 'Active',
        title: 'John Doe Title',
        startDate: '2025-01-01T12:00:00',
        skills: {
          create: [
            { skill: { connect: { id: skills[0].id } } }, // JavaScript
            { skill: { connect: { id: skills[2].id } } }  // React
          ]
        }
      },
      include: {
        skills: true
      }
    }),
    prisma.teamMember.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        department: 'Engineering',
        status: 'Active',
        title: 'Jane Smith Title',
        startDate: '2025-02-02T12:00:00',
        skills: {
          create: [
            { skill: { connect: { id: skills[1].id } } }, // TypeScript
            { skill: { connect: { id: skills[3].id } } }, // Node.js
            { skill: { connect: { id: skills[4].id } } }  // PostgreSQL
          ]
        }
      },
      include: {
        skills: true
      }
    })
  ]);
  console.log('Created team members:', teamMembers);

  console.log('Seed completed successfully!');
}

seed()
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
