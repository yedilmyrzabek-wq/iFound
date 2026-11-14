// Second-queue AI hook point (TZ §24). Server-only, behind FEATURE_AI. An AI failure must never break the core flow.
import "server-only";

export const aiEnabled = () => process.env.FEATURE_AI === "true";
