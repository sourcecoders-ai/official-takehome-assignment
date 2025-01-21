import React, { useState, useEffect } from 'react';
import { 
  ChakraProvider, 
  Container, 
  VStack, 
  Heading, 
  Button 
} from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamMemberList from './components/TeamMemberList';
import TeamMemberForm from './components/TeamMemberForm';
import { teamMemberService } from './services/api';
import { TeamMember } from './types';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const fetchTeamMembers = async () => {
    try {
      console.log('Fetching team members...');
      const members = await teamMemberService.getAll();
      console.log('Fetched team members:', members);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={6} align="stretch">
            <Heading textAlign="center">Team Directory</Heading>
            
            {!isAddingMember ? (
              <>
                <Button 
                  colorScheme="green" 
                  alignSelf="flex-end"
                  onClick={() => setIsAddingMember(true)}
                >
                  Add Team Member
                </Button>
                <TeamMemberList 
                  teamMembers={teamMembers} 
                  onRefresh={fetchTeamMembers} 
                />
              </>
            ) : (
              <TeamMemberForm 
                onSubmit={() => {
                  setIsAddingMember(false);
                  fetchTeamMembers();
                }}
                onCancel={() => setIsAddingMember(false)} 
              />
            )}
          </VStack>
        </Container>
      </QueryClientProvider>
    </ChakraProvider>
  );
};

export default App;
