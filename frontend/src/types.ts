export interface Skill {
  id: number;
  name: string;
}

export interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  skills: Skill[];
  department: string;
  status: string;
  title: string;
}

export interface CreateTeamMemberDto {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  skillIds?: number[];
  department: string;
  status: string;
}
