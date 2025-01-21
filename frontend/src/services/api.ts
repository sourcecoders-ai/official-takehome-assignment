import axios from 'axios';
import { TeamMember, CreateTeamMemberDto, Skill } from '../types';

// Cache and request deduplication storage
const cache = new Map<string, { data: any, timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_DURATION = 60 * 1000; // 1 minute cache

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000, // 10 seconds
  retry: 3, // Retry failed requests up to 3 times
  retryDelay: 1000 // Wait 1 second between retries
});

// Add caching interceptor
apiClient.interceptors.request.use(config => {
  if (config.method?.toLowerCase() === 'get') {
    const cacheKey = JSON.stringify({
      url: config.url,
      params: config.params
    });
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Serving from cache:', cacheKey);
      return {
        ...config,
        adapter: () => Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        })
      };
    }

    // Check for pending requests
    if (pendingRequests.has(cacheKey)) {
      console.log('Deduplicating request:', cacheKey);
      return {
        ...config,
        adapter: () => pendingRequests.get(cacheKey)
      };
    }

    // Store the pending request
    const requestPromise = apiClient(config)
      .finally(() => pendingRequests.delete(cacheKey));
    pendingRequests.set(cacheKey, requestPromise);
  }
  return config;
});

apiClient.interceptors.response.use(response => {
  if (response.config.method?.toLowerCase() === 'get') {
    const cacheKey = JSON.stringify({
      url: response.config.url,
      params: response.config.params
    });
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
  }
  return response;
});

// Add retry interceptor
apiClient.interceptors.response.use(undefined, (error) => {
  const config = error.config;
  
  // If we have no config or retry option, reject
  if (!config || !config.retry) {
    return Promise.reject(error);
  }

  // Set retry count
  config.__retryCount = config.__retryCount || 0;

  // Check if we've maxed out retries
  if (config.__retryCount >= config.retry) {
    return Promise.reject(error);
  }

  // Increase retry count
  config.__retryCount += 1;

  // Create new promise to handle exponential backoff
  const delay = config.retryDelay || 1000;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Retrying request (${config.__retryCount}/${config.retry})`);
      resolve(apiClient(config));
    }, delay * config.__retryCount);
  });
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  config => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  error => {
    console.error('API Error:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : null
    });
    return Promise.reject(error);
  }
);

export const teamMemberService = {
  async getAll(params?: URLSearchParams, config?: AxiosRequestConfig): Promise<TeamMember[]> {
    try {
      const response = await apiClient.get('/team-members', {
        params,
        ...config
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request canceled', error.message);
        throw error;
      }
      console.error('Failed to fetch team members:', error);
      throw new Error('Failed to fetch team members. Please try again later.');
    }
  },

  async create(data: CreateTeamMemberDto): Promise<TeamMember> {
    try {
      const response = await apiClient.post('/team-members', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create team member:', error);
      throw new Error('Failed to create team member. Please try again later.');
    }
  },

  async update(id: number, data: CreateTeamMemberDto): Promise<TeamMember> {
    try {
      const response = await apiClient.patch(`/team-members/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update team member:', error);
      throw new Error('Failed to update team member. Please try again later.');
    }
  },

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/team-members/${id}`);
    } catch (error) {
      console.error('Failed to delete team member:', error);
      throw new Error('Failed to delete team member. Please try again later.');
    }
  }
};

export const skillService = {
  async getAll(): Promise<Skill[]> {
    try {
      const response = await apiClient.get('/skills');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      throw new Error('Failed to fetch skills. Please try again later.');
    }
  },

  async create(name: string): Promise<Skill> {
    try {
      const response = await apiClient.post('/skills', { name });
      return response.data;
    } catch (error) {
      console.error('Failed to create skill:', error);
      throw new Error('Failed to create skill. Please try again later.');
    }
  },

  async seed(): Promise<Skill[]> {
    try {
      const response = await apiClient.post('/skills/seed');
      return response.data;
    } catch (error) {
      console.error('Failed to seed skills:', error);
      throw new Error('Failed to seed skills. Please try again later.');
    }
  }
};
