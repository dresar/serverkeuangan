/**
 * cPanel Phusion Passenger Entry Point
 * This file acts as a bridge for cPanel's Node.js Selector.
 * It imports the production-bundled server.
 */

// Import the bundled ESM server
// We use dynamic import because the bundle is ESM and cPanel may run in different modes
import('./dist/server.js').catch(err => {
    console.error('Failed to load server bundle:', err);
    process.exit(1);
});
