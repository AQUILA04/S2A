import type { Config } from "jest";

const config: Config = {
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
