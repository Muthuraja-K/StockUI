import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  stockApiBaseUrl: 'https://stockapi-production-c428.up.railway.app', // Empty string for relative URLs in production
  apiTimeout: 60000,
  enableLogging: false,
  version: '1.0.0'
};
