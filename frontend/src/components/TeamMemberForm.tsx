import React, { useState, useEffect } from 'react';
import { 
  VStack, 
  Input, 
  Button, 
  FormControl, 
  FormLabel,
  Select,
  Wrap,
  Tag,
  TagCloseButton,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { TeamMember, Skill } from '../types';
import { teamMemberService, skillService } from '../services/api';

interface TeamMemberFormProps {
  initialData?: TeamMember | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [status, setStatus] = useState(initialData?.status || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const loadSkills = async () => {
      setLoading(true);
      try {
        const skills = await skillService.getAll();
        setAvailableSkills(skills);
        if (initialData) {
          setSkills(initialData.skills);
        }
      } catch (error: any) {
        console.error('Failed to load skills:', error);
        toast({
          title: 'Error loading skills',
          description: error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    const seedSkills = async () => {
      try {
        await skillService.seed();
      } catch (error) {
        console.error('Failed to seed skills:', error);
      }
    };

    seedSkills();
    loadSkills();
  }, [initialData]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        firstName,
        lastName,
        email,
        department,
        status,
        startDate,
        skillIds: skills.map(skill => skill.id)
      };

      if (initialData) {
        await teamMemberService.update(initialData.id, payload);
      } else {
        await teamMemberService.create(payload);
      }
      onSubmit();
    } catch (error: any) {
      console.error('Failed to save team member:', error);
      toast({
        title: 'Error saving team member',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    const skill = availableSkills.find(s => s.id.toString() === selectedSkill);
    if (skill && !skills.some(s => s.id === skill.id)) {
      setSkills([...skills, skill]);
      setSelectedSkill('');
    }
  };

  const removeSkill = (skillId: number) => {
    setSkills(skills.filter(skill => skill.id !== skillId));
  };

  return (
    <VStack spacing={6} align="stretch" width="100%" maxWidth="600px" mx="auto">
      <FormControl isRequired>
        <FormLabel fontWeight="medium">First Name</FormLabel>
        <Input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter first name"
          size="lg"
          borderRadius="md"
          _focus={{
            borderColor: "blue.400",
            boxShadow: "0 0 0 1px blue.400"
          }}
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Last Name</FormLabel>
        <Input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter last name"
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Title</FormLabel>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title"
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Department</FormLabel>
        <Input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Enter department"
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Status</FormLabel>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Select status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </Select>
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Start Date</FormLabel>
        <Input
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Enter start date"
          type="date"
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Email</FormLabel>
        <Input 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Enter email" 
          type="email"
        />
      </FormControl>

      <FormControl>
        <FormLabel>Skills</FormLabel>
        <Wrap>
          {skills.map(skill => (
            <Tag key={skill.id}>
              {skill.name}
              <TagCloseButton onClick={() => removeSkill(skill.id)} />
            </Tag>
          ))}
        </Wrap>
        <Wrap mt={2}>
          <Select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            placeholder="Select skill"
            isDisabled={loading}
          >
            {availableSkills
              .filter(skill => !skills.some(s => s.id === skill.id))
              .map(skill => (
                <option key={skill.id} value={skill.id.toString()}>
                  {skill.name}
                </option>
              ))}
          </Select>
          <Button onClick={addSkill} colorScheme="blue" isDisabled={loading}>
            Add Skill
          </Button>
        </Wrap>
      </FormControl>

      <Wrap>
        <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading} type="submit">
          {initialData ? 'Update' : 'Create'}
        </Button>
        <Button onClick={onCancel} isDisabled={loading}>Cancel</Button>
      </Wrap>
       {loading && <Spinner />}
    </VStack>
  );
};

export default TeamMemberForm;
