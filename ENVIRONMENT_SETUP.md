# Environment Configuration Guide

This document explains how to use different environment configurations for development and production in your StockUI application.

## Environment Files

### 1. `environment.ts` (Default)
- **Purpose**: Base environment configuration
- **Usage**: This file is replaced during build based on the configuration

### 2. `environment.development.ts`
- **Purpose**: Development environment settings
- **API URL**: `http://localhost:8000`
- **Features**: 
  - Logging enabled
  - Shorter API timeout (30s)
  - Source maps enabled
  - No optimization

### 3. `environment.prod.ts`
- **Purpose**: Production environment settings
- **API URL**: `http://184.72.25.56:8000`
- **Features**:
  - Logging disabled
  - Longer API timeout (60s)
  - Full optimization
  - Output hashing

## Available Scripts

### Development
```bash
# Start development server (localhost:8000)
npm run start:dev

# Build for development
npm run build:dev

# Build and copy to API static folder
npm run build-and-copy
```

### Production
```bash
# Start production server (production API)
npm run start:prod

# Build for production
npm run build:prod

# Build and copy to API static folder
npm run build-prod-and-copy

# Full production deployment
npm run deployprod
```

### Default Commands
```bash
# Default start (development)
npm start

# Default build (production)
npm run build
```

## How It Works

1. **File Replacement**: Angular CLI automatically replaces `environment.ts` with the appropriate environment file during build
2. **Configuration Selection**: Based on the `--configuration` flag or default configuration
3. **Environment Variables**: All environment-specific values are available in your components via `environment.*`

## Usage in Components

```typescript
import { environment } from '../environments/environment';

export class MyService {
  private apiUrl = environment.stockApiBaseUrl;
  
  constructor() {
    if (environment.enableLogging) {
      console.log('API URL:', this.apiUrl);
    }
  }
}
```

## Environment Variables

| Variable | Development | Production |
|----------|-------------|------------|
| `production` | `false` | `true` |
| `stockApiBaseUrl` | `http://localhost:8000` | `http://184.72.25.56:8000` |
| `apiTimeout` | `30000` (30s) | `60000` (60s) |
| `enableLogging` | `true` | `false` |
| `version` | `1.0.0` | `1.0.0` |

## Switching Environments

### During Development
- Use `npm run start:dev` for local development
- Use `npm run start:prod` to test against production API

### During Build
- Use `npm run build:dev` for development builds
- Use `npm run build:prod` for production builds

### Deployment
- Development: `npm run build-and-copy`
- Production: `npm run deployprod`

## Notes

- The default configuration is set to `production` in `angular.json`
- Environment files are automatically replaced during build
- Always use `environment.*` variables instead of hardcoded values
- Production builds include optimizations and minification
