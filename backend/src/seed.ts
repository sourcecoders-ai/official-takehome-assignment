import { PrismaClient } from '@prisma/client';

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
        name: 'John Doe',
        email: 'john@example.com',
        department: 'Engineering',
        status: 'Active',
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
        name: 'Jane Smith',
        email: 'jane@example.com',
        department: 'Engineering',
        status: 'Active',
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
