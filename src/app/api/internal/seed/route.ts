import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Internal seed endpoint — populates the demo workspace with sample
 * notebooks, notes, and tags. Only reachable from Docker network.
 *
 * POST /api/internal/seed { space: "demo" }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const spaceSlug: string = body.space?.trim();
  if (!spaceSlug) {
    return NextResponse.json({ error: "Missing space" }, { status: 400 });
  }

  // Check if already seeded
  const existingNotes = await prisma.note.count({
    where: { notebook: { workspaceSlug: spaceSlug } },
  });
  if (existingNotes > 0) {
    return NextResponse.json({ status: "already_seeded", notes: existingNotes });
  }

  // Create demo user
  const alice = await prisma.user.upsert({
    where: { did: "did:demo:alice" },
    update: {},
    create: { did: "did:demo:alice", username: "Alice" },
  });

  // ─── Notebook 1: Research ────────────────────────────────────
  const research = await prisma.notebook.create({
    data: {
      title: "Open Source Governance Research",
      slug: `${spaceSlug}-governance-research`,
      description: "Patterns and case studies in decentralized decision-making",
      coverColor: "#3b82f6",
      isPublic: true,
      workspaceSlug: spaceSlug,
      collaborators: { create: { userId: alice.id, role: "OWNER" } },
    },
  });

  // Create tags
  const tagGovernance = await prisma.tag.create({
    data: { name: "governance", color: "#8b5cf6", spaceId: spaceSlug },
  });
  const tagWeb3 = await prisma.tag.create({
    data: { name: "web3", color: "#06b6d4", spaceId: spaceSlug },
  });
  const tagIdeas = await prisma.tag.create({
    data: { name: "ideas", color: "#f59e0b", spaceId: spaceSlug },
  });
  const tagMeeting = await prisma.tag.create({
    data: { name: "meeting-notes", color: "#10b981", spaceId: spaceSlug },
  });

  // Notes in research notebook
  const note1 = await prisma.note.create({
    data: {
      notebookId: research.id,
      authorId: alice.id,
      title: "Quadratic Voting: Fair Group Decisions",
      content:
        "<p>Quadratic voting lets participants express <strong>intensity of preference</strong>, not just direction. Cost of votes scales quadratically — 1 vote costs 1 credit, 2 votes cost 4, 3 cost 9, etc.</p><p>This prevents whale dominance while letting those who care most have a stronger voice. Used by Gitcoin, RadicalxChange, and Colorado state legislature experiments.</p>",
      type: "NOTE",
      cardType: "reference",
      visibility: "public",
      isPinned: true,
      position: 1,
    },
  });
  await prisma.noteTag.createMany({
    data: [
      { noteId: note1.id, tagId: tagGovernance.id },
      { noteId: note1.id, tagId: tagWeb3.id },
    ],
  });

  const note2 = await prisma.note.create({
    data: {
      notebookId: research.id,
      authorId: alice.id,
      title: "Gitcoin Grants: Quadratic Funding in Practice",
      content:
        "<p>Gitcoin has distributed $50M+ using quadratic funding. The number of contributors matters more than amount — many small donations get amplified by the matching pool.</p><p>Key insight: QF aligns funding with community preference, not just whale wallets.</p>",
      type: "BOOKMARK",
      url: "https://gitcoin.co",
      cardType: "link",
      visibility: "public",
      position: 2,
    },
  });
  await prisma.noteTag.createMany({
    data: [
      { noteId: note2.id, tagId: tagGovernance.id },
      { noteId: note2.id, tagId: tagWeb3.id },
    ],
  });

  await prisma.note.create({
    data: {
      notebookId: research.id,
      authorId: alice.id,
      title: "DAO Treasury Management Patterns",
      content:
        "<p>Multi-sig wallets (like Safe) reduce speed but increase trust. Common patterns:</p><ul><li><strong>3-of-5</strong> for small DAOs — fast enough, secure enough</li><li><strong>Streaming payments</strong> via Superfluid for ongoing commitments</li><li><strong>Retroactive funding</strong> — reward impact after it's proven</li></ul><p>The hardest part isn't the tech — it's agreeing on priorities.</p>",
      type: "NOTE",
      cardType: "idea",
      visibility: "space",
      position: 3,
    },
  });

  await prisma.note.create({
    data: {
      notebookId: research.id,
      authorId: alice.id,
      title: "Consent-Based Decision Making",
      content:
        "<p>Unlike consensus (everyone agrees), consent means <em>no one has a principled objection</em>. Much faster for groups.</p><p>Process: Propose → Clarify → React → Amend → Consent check. If no objections, proceed. Objections are gifts — they reveal risks.</p>",
      type: "NOTE",
      cardType: "reference",
      visibility: "public",
      position: 4,
    },
  });

  // ─── Notebook 2: Meeting Notes ────────────────────────────────
  const meetings = await prisma.notebook.create({
    data: {
      title: "Community Meetings",
      slug: `${spaceSlug}-meetings`,
      description: "Notes and action items from our regular check-ins",
      coverColor: "#f59e0b",
      isPublic: true,
      workspaceSlug: spaceSlug,
      collaborators: { create: { userId: alice.id, role: "OWNER" } },
    },
  });

  const meeting1 = await prisma.note.create({
    data: {
      notebookId: meetings.id,
      authorId: alice.id,
      title: "Weekly Standup — Feb 24",
      content:
        "<h3>Attendees</h3><p>Alice, Bob, Charlie</p><h3>Updates</h3><ul><li><strong>Alice:</strong> Finished governance research, ready to implement voting</li><li><strong>Bob:</strong> Garden supplies cart is 65% funded</li><li><strong>Charlie:</strong> Whiteboard arrived — will install Thursday</li></ul><h3>Blockers</h3><p>None this week</p>",
      type: "NOTE",
      cardType: "note",
      visibility: "space",
      isPinned: true,
      position: 1,
    },
  });
  await prisma.noteTag.create({
    data: { noteId: meeting1.id, tagId: tagMeeting.id },
  });

  // Action items as child notes
  await prisma.note.create({
    data: {
      notebookId: meetings.id,
      authorId: alice.id,
      parentId: meeting1.id,
      title: "Action: Set up quadratic voting for treasury proposals",
      content: "<p>Alice to configure rvote with 7-day voting period and 50 starting credits per member.</p>",
      type: "NOTE",
      cardType: "task",
      visibility: "space",
      position: 1.1,
    },
  });

  await prisma.note.create({
    data: {
      notebookId: meetings.id,
      authorId: alice.id,
      parentId: meeting1.id,
      title: "Action: Share garden cart link with broader community",
      content: "<p>Bob to post the rcart link in rsocials to get more contributors.</p>",
      type: "NOTE",
      cardType: "task",
      visibility: "space",
      position: 1.2,
    },
  });

  // ─── Notebook 3: Ideas ────────────────────────────────────────
  const ideas = await prisma.notebook.create({
    data: {
      title: "Project Ideas",
      slug: `${spaceSlug}-ideas`,
      description: "Brainstorms, what-ifs, and possibilities",
      coverColor: "#ec4899",
      isPublic: true,
      workspaceSlug: spaceSlug,
      collaborators: { create: { userId: alice.id, role: "OWNER" } },
    },
  });

  const idea1 = await prisma.note.create({
    data: {
      notebookId: ideas.id,
      authorId: alice.id,
      title: "Community Currency / Time Banking",
      content:
        "<p>What if we tracked contributions in a local currency? Members earn credits for volunteering, teaching, or helping — then spend them on services from other members.</p><p><strong>Tools to explore:</strong> Circles UBI, Grassroots Economics, or a simple ledger in rcart.</p>",
      type: "NOTE",
      cardType: "idea",
      visibility: "public",
      isPinned: true,
      position: 1,
    },
  });
  await prisma.noteTag.create({
    data: { noteId: idea1.id, tagId: tagIdeas.id },
  });

  await prisma.note.create({
    data: {
      notebookId: ideas.id,
      authorId: alice.id,
      title: "Skill-Share Wednesdays",
      content:
        "<p>Rotating weekly sessions where someone teaches something they know. Could be cooking, coding, gardening, music — anything. Low pressure, high connection.</p>",
      type: "NOTE",
      cardType: "idea",
      visibility: "public",
      position: 2,
    },
  });

  return NextResponse.json({
    status: "seeded",
    space: spaceSlug,
    notebooks: 3,
    notes: 9,
    tags: 4,
  }, { status: 201 });
}
