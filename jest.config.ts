import type { Config } from "jest";

const config: Config = {
    projects: [
        {
            // ── Unit tests (Node env — services, actions, schemas, utilities)
            displayName: "unit",
            testEnvironment: "node",
            transform: {
                "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
            },
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/$1",
            },
            testMatch: ["**/__tests__/**/*.test.ts"],
            collectCoverageFrom: [
                "lib/**/*.ts",
                "app/**/*.ts",
                "app/**/*.tsx",
                "scripts/**/*.ts",
                "!**/*.d.ts",
                "!**/node_modules/**",
            ],
        },
        {
            // ── Component tests (jsdom env — React Testing Library)
            displayName: "components",
            testEnvironment: "jest-environment-jsdom",
            transform: {
                "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
            },
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/$1",
                // Stub CSS/images imports that Next.js handles at build time
                "^.+\\.(css|scss|png|jpg|jpeg|gif|svg|webp)$": "<rootDir>/__mocks__/fileMock.js",
            },
            setupFilesAfterEnv: ["@testing-library/jest-dom"],
            testMatch: ["**/__tests__/**/*.test.tsx"],
        },
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};

export default config;
