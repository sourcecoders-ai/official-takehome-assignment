import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { corsConfig } from './config/cors';
import { PrismaClient } from '@prisma/client';
import { teamMemberRouter } from './routes/teamMember';
import { skillRouter } from './routes/skill';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(cors());
app.options('*', cors()) // include before other routes
export const prisma = new PrismaClient();

// Enhanced debug routes with error handling
app.get('/_debug/routes', (req, res, next) => {
  console.log('Debug routes endpoint accessed');
  const routes: { method: string, path: string }[] = [];
  
  const collectRoutes = (layer: any, prefix: string = '') => {
    if (layer.route) {
      // Handle regular routes
      routes.push({
        method: Object.keys(layer.route.methods).join(','),
        path: prefix + layer.route.path
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // Handle router instances
      const newPrefix = layer.regexp.source
        .replace('^\\', '')
        .replace('(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/\/\$/g, '')
        .replace(/\/\?/g, '')
        .replace(/\(\?.*?\)/g, '')
        .replace(/\[(.*?)\]/g, ':$1');
      
      layer.handle.stack.forEach((handler: any) => {
        collectRoutes(handler, prefix + newPrefix);
      });
    } else if (layer.path) {
      // Handle mounted routes
      routes.push({
        method: layer.methods.join(','),
        path: prefix + layer.path
      });
    }
  };

  app._router.stack.forEach((layer: any) => {
    collectRoutes(layer);
  });

  try {
    if (!routes.length) {
      console.warn('No routes found - this might indicate a routing setup issue');
    }
    
    res.json({
      status: 'success',
      total: routes.length,
      routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage()
    });
  } catch (error) {
    console.error('Error in debug routes handler:', error);
    next(error);
  }
});

// Basic middleware
app.use(express.json());
app.use(cors(corsConfig));
app.use(morgan('dev'));

// Rate limiting middleware
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable legacy headers
  handler: (req, res, next, options) => {
    const err = new Error(options.message);
    err.name = 'RateLimitError';
    (err as any).retryAfter = Math.ceil(options.windowMs / 1000);
    next(err);
  }
});

// Apply rate limiting to all requests
app.use(limiter);

// Health check endpoint
app.get('/_debug/health', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    if (!result) {
      throw new Error('Database query failed');
    }
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// Routes
app.use('/api/team-members', teamMemberRouter);
app.use('/api/skills', skillRouter);

// Catch-all route handler - must be before error handling
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip if the route exists
  if (req.route) {
    return next();
  }

  // Collect all available routes
  const routes: { method: string, path: string }[] = [];
  
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        method: Object.keys(middleware.route.methods).join(','),
        path: middleware.route.path
      });
    } else if (middleware.name === 'router') {
      const prefix = middleware.regexp.toString().match(/^\/\\(\^\\\/([^\/]*)\\\/)/) || [];
      const routePrefix = prefix[2] || '';
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            method: Object.keys(handler.route.methods).join(','),
            path: `/${routePrefix}${handler.route.path}`
          });
        }
      });
    }
  });

  // Format the response similar to Django's debug page
  if (process.env.NODE_ENV === 'development') {
    const formattedRoutes = routes
      .sort((a, b) => a.path.localeCompare(b.path))
      .map(route => ({
        method: route.method.toUpperCase(),
        path: route.path,
        description: `API endpoint for ${route.path.split('/')[2] || 'root'} operations`
      }));

    res.status(404).json({
      error: `404 Not Found: ${req.method} ${req.path}`,
      message: 'The requested URL was not found on this server.',
      help: 'Here are the available API endpoints:',
      endpoints: formattedRoutes,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      documentation: 'https://example.com/api-docs'
    });
  } else {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  }
});

// Enhanced error handling with route visibility
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error occurred:', err);
  
  // Collect routes even in error state
  const routes: { method: string, path: string }[] = [];
  const collectRoutes = (layer: any, prefix: string = '') => {
    if (layer.route) {
      routes.push({
        method: Object.keys(layer.route.methods).join(','),
        path: prefix + layer.route.path
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const newPrefix = layer.regexp.source
        .replace('^\\', '')
        .replace('(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/\/\$/g, '')
        .replace(/\/\?/g, '')
        .replace(/\(\?.*?\)/g, '')
        .replace(/\[(.*?)\]/g, ':$1');
      
      layer.handle.stack.forEach((handler: any) => {
        collectRoutes(handler, prefix + newPrefix);
      });
    } else if (layer.path) {
      routes.push({
        method: layer.methods.join(','),
        path: prefix + layer.path
      });
    }
  };

  app._router.stack.forEach((layer: any) => {
    collectRoutes(layer);
  });

  // Add routes to error response in development
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      availableRoutes: routes.sort((a, b) => a.path.localeCompare(b.path)),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } else {
    errorHandler(err, req, res, next);
  }
});

// Enhanced startup logging
console.log('\n=== Application Startup ===');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Node Version: ${process.version}`);
console.log(`Memory Usage: ${JSON.stringify(process.memoryUsage())}`);
console.log('\n=== Registered Routes ===');
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    console.log(`${Object.keys(middleware.route.methods).join(',')} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    const prefix = middleware.regexp.toString().match(/^\/\\(\^\\\/([^\/]*)\\\/)/) || [];
    const routePrefix = prefix[2] || '';
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        const path = handler.route.path;
        const methods = Object.keys(handler.route.methods);
        console.log(`${methods.join(',')} /${routePrefix}${path}`);
      }
    });
  }
});
console.log('=====================');

export { app };
