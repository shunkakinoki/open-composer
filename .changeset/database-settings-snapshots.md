---
"@open-composer/db": minor
"open-composer": minor
---

Add database and settings snapshot functionality

### Database Enhancements
- Add comprehensive database snapshot functions (`createDatabaseSnapshot`, `createSettingsSnapshot`, `restoreSettingsSnapshot`)
- Add migration status tracking (`getMigrationStatus`) 
- Add database schema validation (`validateDatabaseSchema`)
- Implement dynamic migration discovery from filesystem
- Add users table schema with proper TypeScript types

### CLI Improvements  
- Add complete settings management CLI commands (`settings get/set/list/delete`)
- Add table formatting for settings list output
- Fix table formatting crash with proper column width calculations
- Integrate settings service with CLI application

### Testing & Quality
- Add comprehensive test suite for all snapshot functions
- Test settings backup/restore workflow end-to-end
- Add schema validation and migration status tests
- Ensure type safety with proper TypeScript types

### Technical Details
- Uses Effect-TS for type-safe database operations
- Implements proper error handling and type assertions
- Maintains backward compatibility with existing functionality
- Follows established patterns for CLI command structure
