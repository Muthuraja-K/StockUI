import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  stockApiBaseUrl: 'http://127.0.0.1:8000',
  apiTimeout: 30000,
  enableLogging: true,
  version: '1.0.0'
};
