import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

const handler = (request: Request) => toNextJsHandler(getAuth()).POST(request);
const getHandler = (request: Request) => toNextJsHandler(getAuth()).GET(request);

export { getHandler as GET, handler as POST };
