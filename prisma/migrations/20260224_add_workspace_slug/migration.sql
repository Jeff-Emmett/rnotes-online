-- Add workspaceSlug to Notebook for subdomain-based data isolation
ALTER TABLE "Notebook" ADD COLUMN "workspaceSlug" TEXT NOT NULL DEFAULT '';

-- Index for efficient workspace-scoped queries
CREATE INDEX "Notebook_workspaceSlug_idx" ON "Notebook"("workspaceSlug");
