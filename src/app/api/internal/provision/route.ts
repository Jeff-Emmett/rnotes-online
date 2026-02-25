import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Internal provision endpoint — called by rSpace Registry when activating
 * this app for a space. No auth required (only reachable from Docker network).
 *
 * Payload: { space, description, admin_email, public, owner_did }
 * The owner_did identifies who registered the space via the registry.
 *
 * Creates a default Notebook scoped to the workspace slug + a system collaborator.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const space: string = body.space?.trim();
  if (!space) {
    return NextResponse.json({ error: "Missing space name" }, { status: 400 });
  }
  const ownerDid: string = body.owner_did || "";

  // Check if a notebook already exists for this workspace
  const existing = await prisma.notebook.findFirst({
    where: { workspaceSlug: space },
  });
  if (existing) {
    return NextResponse.json({ status: "exists", id: existing.id, slug: existing.slug, owner_did: ownerDid });
  }

  const systemDid = `did:system:${space}`;
  const user = await prisma.user.upsert({
    where: { did: systemDid },
    update: {},
    create: { did: systemDid, username: `${space}-admin` },
  });

  const notebook = await prisma.notebook.create({
    data: {
      title: `${space.charAt(0).toUpperCase() + space.slice(1)} Notes`,
      slug: `${space}-notes`,
      description: body.description || `Shared notes for ${space}`,
      workspaceSlug: space,
      isPublic: body.public ?? false,
      collaborators: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json({ status: "created", id: notebook.id, slug: notebook.slug, owner_did: ownerDid }, { status: 201 });
}
