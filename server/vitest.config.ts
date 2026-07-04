import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Only run the TS sources — never compiled copies in dist/.
        include: ['src/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
    },
});
