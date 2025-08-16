/**
 * CORS Configuration
 * 
 * This module handles Cross-Origin Resource Sharing (CORS) configuration
 * for the application. It supports both development and production environments
 * through environment variables.
 */

// Default domains that will be allowed in development
const defaultDomains = [
  'http://miguels-macbook-pro:8080',
  'http://miguels-macbook-pro:3000',
  'http://localhost:8080',
  'http://localhost:3000'
];

/**
 * Validates a domain string to ensure it's a valid HTTP(S) URL
 * 
 * @param domain The domain to validate
 * @returns boolean indicating if the domain is valid
 */
export const validateDomain = (domain: string): boolean => {
  try {
    const url = new URL(domain);
    return ['http:', 'https:'].includes(url.protocol) && 
           url.hostname.length > 0 &&
           !url.hostname.includes(' ') &&
           domain === url.origin;
  } catch {
    return false;
  }
};

/**
 * Get allowed domains from environment variables or use defaults
 * Environment variables:
 * - ALLOWED_DOMAINS: Comma-separated list of additional allowed domains
 * - NODE_ENV: Current environment (development/production)
 * 
 * @returns Array of allowed domains
 */
export const getAllowedDomains = (): string[] => {
  const envDomains = process.env.ALLOWED_DOMAINS;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, require explicit domain configuration
  if (isProduction && !envDomains) {
    console.warn('Warning: No ALLOWED_DOMAINS configured in production environment');
    return [];
  }

  const domains = envDomains 
    ? envDomains.split(',')
        .map(d => d.trim())
        .filter(Boolean)
        .filter(domain => {
          const isValid = validateDomain(domain);
          if (!isValid) {
            console.warn(`Warning: Invalid domain "${domain}" will be ignored`);
          }
          return isValid;
        })
    : [];

  // Only include default domains in development
  const allDomains = [...new Set([
    ...(isProduction ? [] : defaultDomains),
    ...domains
  ])];

  // Log any validation failures
  const invalidDomains = allDomains.filter(d => !validateDomain(d));
  if (invalidDomains.length > 0) {
    console.warn('Warning: The following domains failed validation and will be ignored:', invalidDomains);
  }

  return allDomains.filter(validateDomain);
};

// Get domains and validate them
const domains = getAllowedDomains();

// Log CORS configuration on startup
console.log('\nCORS Configuration:');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Allowed Domains:', domains.length ? domains : 'None configured');

export const corsConfig = {
  origin: domains,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Security-Policy'],
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", ...domains],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', ...domains],
      connectSrc: [
        "'self'",
        ...domains,
        ...domains.map(d => d.replace('http', 'ws'))
      ],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
};
