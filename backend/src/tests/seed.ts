import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://user:password@localhost:5433/directory_test'
    }
  }
});

async function main() {
  // Create skills
  const skills = await prisma.skill.createMany({
    data: [
      { name: 'JavaScript' },
      { name: 'TypeScript' },
      { name: 'React' },
      { name: 'Node.js' },
      { name: 'GraphQL' },
      { name: 'UI/UX Design' },
      { name: 'Product Management' },
      { name: 'Agile Methodology' }
    ],
    skipDuplicates: true
  });

  // Create team members with skill associations
  const members = await prisma.teamMember.createMany({
    data: [
      {
        firstName: 'John',
        lastName: 'Doe',
        title: 'Senior Software Engineer',
        department: 'Engineering',
        status: 'Active',
        startDate: new Date('2020-01-15'),
        email: 'john.doe@example.com',
        slackHandle: 'johndoe',
        profileImageUrl: 'https://example.com/john.jpg'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        title: 'UI/UX Designer',
        department: 'Design',
        status: 'Remote',
        startDate: new Date('2021-03-01'),
        email: 'jane.smith@example.com',
        slackHandle: 'janesmith',
        profileImageUrl: 'https://example.com/jane.jpg'
      },
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        title: 'Product Manager',
        department: 'Product',
        status: 'Active',
        startDate: new Date('2019-06-01'),
        email: 'alice.johnson@example.com',
        slackHandle: 'alicej',
        profileImageUrl: 'https://example.com/alice.jpg'
      }
    ]
  });

  // Associate skills with team members
  const john = await prisma.teamMember.findFirst({ where: { email: 'john.doe@example.com' } });
  const jane = await prisma.teamMember.findFirst({ where: { email: 'jane.smith@example.com' } });
  const alice = await prisma.teamMember.findFirst({ where: { email: 'alice.johnson@example.com' } });

  const jsSkill = await prisma.skill.findFirst({ where: { name: 'JavaScript' } });
  const tsSkill = await prisma.skill.findFirst({ where: { name: 'TypeScript' } });
  const reactSkill = await prisma.skill.findFirst({ where: { name: 'React' } });
  const nodeSkill = await prisma.skill.findFirst({ where: { name: 'Node.js' } });
  const designSkill = await prisma.skill.findFirst({ where: { name: 'UI/UX Design' } });
  const productSkill = await prisma.skill.findFirst({ where: { name: 'Product Management' } });
  const agileSkill = await prisma.skill.findFirst({ where: { name: 'Agile Methodology' } });

  if (john && jsSkill && tsSkill && reactSkill && nodeSkill) {
    await prisma.teamMemberSkill.createMany({
      data: [
        { teamMemberId: john.id, skillId: jsSkill.id },
        { teamMemberId: john.id, skillId: tsSkill.id },
        { teamMemberId: john.id, skillId: reactSkill.id },
        { teamMemberId: john.id, skillId: nodeSkill.id }
      ]
    });
  }

  if (jane && designSkill && reactSkill) {
    await prisma.teamMemberSkill.createMany({
      data: [
        { teamMemberId: jane.id, skillId: designSkill.id },
        { teamMemberId: jane.id, skillId: reactSkill.id }
      ]
    });
  }

  if (alice && productSkill && agileSkill) {
    await prisma.teamMemberSkill.createMany({
      data: [
        { teamMemberId: alice.id, skillId: productSkill.id },
        { teamMemberId: alice.id, skillId: agileSkill.id }
      ]
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
