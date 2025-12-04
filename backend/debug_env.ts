import * as dotenv from 'dotenv';
import * as path from 'path';

console.log('Current directory:', process.cwd());
const result = dotenv.config();
console.log('Dotenv result:', result);
console.log('FIREBASE_DATABASE_URL:', process.env.FIREBASE_DATABASE_URL);
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
