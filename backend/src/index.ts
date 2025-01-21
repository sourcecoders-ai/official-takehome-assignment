import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database URL: ${process.env.DATABASE_URL}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('\n=== Development Mode Features ===');
    console.log('* Detailed route listing enabled');
    console.log('* Visit any invalid URL to see available routes');
    console.log('* Example: http://localhost:3000/invalid-path');
    console.log('=================================');
  }
});

export default app;
