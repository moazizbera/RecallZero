import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl =
  "postgresql://recallzero:recallzero@localhost:5432/recallzero?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  },
});