import { validateDomain, getAllowedDomains } from '../config/cors';

describe('CORS Configuration', () => {
  describe('validateDomain', () => {
    it('should accept valid domains', () => {
      const validDomains = [
        'http://localhost:8080',
        'https://example.com',
        'http://subdomain.example.com:3000',
        'https://my-domain.com'
      ];

      validDomains.forEach(domain => {
        expect(validateDomain(domain)).toBe(true);
      });
    });

    it('should reject invalid domains', () => {
      const invalidDomains = [
        'not-a-url',
        'ftp://example.com',
        'http://',
        'https://',
        'http://invalid domain.com',
        '',
        ' ',
        'javascript:alert(1)'
      ];

      invalidDomains.forEach(domain => {
        expect(validateDomain(domain)).toBe(false);
      });
    });
  });

  describe('getAllowedDomains', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('should return default domains in development', () => {
      process.env.NODE_ENV = 'development';
      const domains = getAllowedDomains();
      expect(domains).toContain('http://miguels-macbook-pro:8080');
      expect(domains).toContain('http://miguels-macbook-pro:3000');
      expect(domains).toContain('http://localhost:8080');
      expect(domains).toContain('http://localhost:3000');
    });

    it('should require explicit domains in production', () => {
      process.env.NODE_ENV = 'production';
      const domains = getAllowedDomains();
      expect(domains).toHaveLength(0);
    });

    it('should filter out invalid domains', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_DOMAINS = 'https://valid.com,not-a-url,https://also-valid.com';
      const domains = getAllowedDomains();
      expect(domains).toContain('https://valid.com');
      expect(domains).toContain('https://also-valid.com');
      expect(domains).not.toContain('not-a-url');
    });
  });
});
