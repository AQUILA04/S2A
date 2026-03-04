import { hashPassword, verifyPassword, credentialsSchema } from "./lib/auth/helpers";

async function run() {
    const hash = await hashPassword("password");
    console.log("hash:", hash);
    const valid = await verifyPassword("password", hash);
    console.log("valid:", valid);
    const parsed = credentialsSchema.safeParse({ email: "test2@test.com", password: "password" });
    console.log("parsed:", parsed.success);
}
run();
