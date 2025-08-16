import React, { useState, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  Heading, 
  Text, 
  Button, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalCloseButton, 
  ModalBody, 
  useDisclosure,
  Flex,
  Tag,
  Input,
  Select,
  TagCloseButton
} from '@chakra-ui/react';
import { TeamMember } from '../types';
import { teamMemberService } from '../services/api';
import TeamMemberForm from './TeamMemberForm';
import { useToast, Spinner } from '@chakra-ui/react';

interface TeamMemberListProps {
  teamMembers: TeamMember[];
  onRefresh: (members?: TeamMember[]) => void;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({ teamMembers, onRefresh }) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [skillsFilter, setSkillsFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const toast = useToast();

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await teamMemberService.delete(id);
      onRefresh();
    } catch (error: any) {
      console.error('Failed to delete team member:', error);
      toast({
        title: 'Error deleting team member',
        description: error.response?.data?.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    onOpen();
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchFilteredTeamMembers = async () => {
      if (!isMounted) return;
      
      setFilterLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (departmentFilter) params.append('department', departmentFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (skillsFilter) params.append('skills', skillsFilter);

        const members = await teamMemberService.getAll(params, {
          signal: abortController.signal
        });
        
        if (isMounted) {
          onRefresh(members);
        }
      } catch (error: any) {
        if (error.name !== 'CanceledError' && isMounted) {
          console.error('Failed to fetch team members:', error);
          setError(error);
          toast({
            title: 'Error fetching team members',
            description: error.response?.data?.message || 'An unexpected error occurred',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } finally {
        if (isMounted) {
          setFilterLoading(false);
        }
      }
    };

    // Debounce the filter changes
    const debounceTimer = setTimeout(() => {
      fetchFilteredTeamMembers();
    }, 300);

    return () => {
      isMounted = false;
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      clearTimeout(debounceTimer);
    };
  }, [departmentFilter, statusFilter, skillsFilter, onRefresh]);

  return (
    <Box>
      <Box mb={6} p={4} borderWidth="1px" borderRadius="lg" bg="white">
        <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
          <Box flex="1">
            <Select
              placeholder="Filter by department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              size="md"
              bg="white"
              _hover={{ borderColor: 'blue.300' }}
            >
              <option value="engineering">Engineering</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="hr">HR</option>
            </Select>
          </Box>
          <Box flex="1">
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="md"
              bg="white"
              _hover={{ borderColor: 'blue.300' }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </Select>
          </Box>
          <Box flex="2">
            <Input
              placeholder="Filter by skills (comma separated ids)"
              value={skillsFilter}
              onChange={(e) => setSkillsFilter(e.target.value)}
              size="md"
              bg="white"
              _hover={{ borderColor: 'blue.300' }}
            />
          </Box>
          <Box>
            <Button 
              leftIcon={<span>🔄</span>}
              onClick={() => {
                setDepartmentFilter('');
                setStatusFilter('');
                setSkillsFilter('');
              }}
              size="md"
              colorScheme="gray"
              variant="outline"
              width="full"
            >
              Clear All
            </Button>
          </Box>
        </Flex>
        {(departmentFilter || statusFilter || skillsFilter) && (
          <Flex mt={3} gap={2} flexWrap="wrap">
            {departmentFilter && (
              <Tag colorScheme="blue" size="md">
                Department: {departmentFilter}
                <TagCloseButton onClick={() => setDepartmentFilter('')} />
              </Tag>
            )}
            {statusFilter && (
              <Tag colorScheme="green" size="md">
                Status: {statusFilter}
                <TagCloseButton onClick={() => setStatusFilter('')} />
              </Tag>
            )}
            {skillsFilter && (
              <Tag colorScheme="purple" size="md">
                Skills: {skillsFilter}
                <TagCloseButton onClick={() => setSkillsFilter('')} />
              </Tag>
            )}
          </Flex>
        )}
      </Box>
      {error ? (
        <Box textAlign="center" p={8} borderWidth={1} borderRadius="md">
          <Text fontSize="lg" color="red.600">Error loading team members</Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            {error.message}
          </Text>
          <Button 
            mt={4}
            colorScheme="blue"
            onClick={() => {
              setError(null);
              onRefresh();
            }}
          >
            Retry
          </Button>
        </Box>
      ) : filterLoading ? (
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" />
          <Text ml={4}>Applying filters...</Text>
        </Flex>
      ) : loading ? (
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" />
          <Text ml={4}>Loading team members...</Text>
        </Flex>
      ) : teamMembers.length === 0 ? (
        <Box textAlign="center" p={8} borderWidth={1} borderRadius="md">
          <Text fontSize="lg" color="gray.600">No team members found</Text>
          <Text fontSize="sm" color="gray.500" mt={2}>Try adjusting your filters or add a new team member</Text>
        </Box>
      ) : (
        <VStack spacing={4} align="stretch">
          {teamMembers.map(member => (
          <Flex
            key={member.id} 
            p={6} 
            borderWidth={1} 
            borderRadius="lg" 
            justifyContent="space-between" 
            alignItems="center"
            boxShadow="sm"
            _hover={{ boxShadow: "md", borderColor: "blue.200" }}
            transition="all 0.2s"
            bg="white"
          >
            <Box flex="1">
              <Heading size="md" mb={2}>{member.firstName} {member.lastName}</Heading>
              <Text color="gray.600" fontSize="sm" mb={2}>
                <strong>{member.title}</strong> • {member.department}
              </Text>
              <Text color="gray.500" fontSize="sm" mb={3}>{member.email}</Text>
              <Flex mt={2} flexWrap="wrap" gap={2}>
                {(member.skills || []).map(skill => (
                  <Tag 
                    key={skill.id} 
                    size="sm" 
                    colorScheme="blue" 
                    borderRadius="full"
                    px={3}
                  >
                    {skill.name}
                  </Tag>
                ))}
              </Flex>
            </Box>
            <Flex gap={3}>
              <Button 
                colorScheme="blue" 
                size="sm" 
                onClick={() => handleEdit(member)}
                leftIcon={<span>✏️</span>}
                variant="outline"
              >
                Edit
              </Button>
              <Button 
                colorScheme="red" 
                size="sm" 
                onClick={() => handleDelete(member.id)}
                isLoading={loading}
                leftIcon={<span>🗑️</span>}
                variant="ghost"
              >
                Delete
              </Button>
            </Flex>
          </Flex>
          ))}
        </VStack>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedMember ? 'Edit Team Member' : 'Add Team Member'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TeamMemberForm 
              initialData={selectedMember} 
              onSubmit={() => {
                onClose();
                onRefresh();
              }} 
              onCancel={onClose} 
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TeamMemberList;
