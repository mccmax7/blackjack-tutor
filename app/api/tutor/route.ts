import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Card, TutorAction } from "@/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a friendly blackjack tutor. The player will tell you their cards and the dealer's up-card; you respond with the basic-strategy action plus a short, conversational explanation.

House rules they're playing: dealer stands on soft 17, blackjack pays 3:2, no surrender, splits and double-after-split allowed (one card on split aces).

Decision order: pairs → soft totals → hard totals.

Pair-split chart (when canSplit is true):
- Always split: A,A and 8,8.
- Never split: 5,5 and 10,10.
- 9,9: split vs 2-6, 8, 9; stand vs 7, 10, A.
- 7,7: split vs 2-7; otherwise hit.
- 6,6: split vs 2-6; otherwise hit.
- 4,4: split vs 5-6 only.
- 2,2 / 3,3: split vs 2-7; otherwise hit.

Soft totals (an Ace counted as 11):
- Soft 13-14 (A,2 / A,3): double vs 5-6 (when canDouble) else hit.
- Soft 15-16 (A,4 / A,5): double vs 4-6 (when canDouble) else hit.
- Soft 17 (A,6): double vs 3-6 (when canDouble) else hit.
- Soft 18 (A,7): double vs 3-6 (when canDouble), stand vs 2,7,8, hit vs 9,10,A.
- Soft 19+: stand.

Hard totals:
- 8 or less: hit.
- 9: double vs 3-6 (when canDouble) else hit.
- 10: double vs 2-9 (when canDouble) else hit.
- 11: double vs 2-10 (when canDouble), hit vs A.
- 12: stand vs 4-6, else hit.
- 13-16: stand vs 2-6, else hit.
- 17+: stand.

Voice guidelines for the reason:
- One or two short sentences. Plain English.
- Mention the specific dealer card and what makes it weak/strong.
- No card-counting, no betting strategy, no probability percentages.
- Don't preface with "I think" or "you should" — be direct.

Return your answer ONLY by calling the "advise" tool. Never reply in plain text.`;

interface RequestBody {
  player: Card[];
  dealerUp: Card;
  canDouble?: boolean;
  canSplit?: boolean;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    !Array.isArray(body.player) ||
    body.player.length === 0 ||
    !body.dealerUp
  ) {
    return NextResponse.json(
      { error: "Missing player or dealerUp" },
      { status: 400 },
    );
  }

  const handDescription = describeHand(
    body.player,
    body.dealerUp,
    body.canDouble ?? false,
    body.canSplit ?? false,
  );

  const client = new Anthropic();

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        {
          name: "advise",
          description:
            "Recommend the next blackjack action with a short reason.",
          input_schema: {
            type: "object" as const,
            properties: {
              action: {
                type: "string",
                enum: ["Hit", "Stand", "Double", "Split"],
              },
              reason: {
                type: "string",
                description: "1-2 sentences in plain English.",
              },
            },
            required: ["action", "reason"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "advise" },
      messages: [{ role: "user", content: handDescription }],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not call the advise tool");
    }
    const input = toolUse.input as { action?: TutorAction; reason?: string };
    if (!input.action || !input.reason) {
      throw new Error("Malformed tool input");
    }

    return NextResponse.json({
      action: input.action,
      reason: input.reason,
    });
  } catch (err) {
    console.error("[/api/tutor] error", err);
    return NextResponse.json(
      { error: "Tutor temporarily unavailable" },
      { status: 502 },
    );
  }
}

function describeHand(
  player: Card[],
  dealerUp: Card,
  canDouble: boolean,
  canSplit: boolean,
): string {
  const cards = player.map((c) => `${c.rank}${c.suit}`).join(", ");
  return [
    `Player hand: ${cards}.`,
    `Dealer's up-card: ${dealerUp.rank}${dealerUp.suit}.`,
    `Legal actions right now: Hit, Stand${canDouble ? ", Double" : ""}${
      canSplit ? ", Split" : ""
    }.`,
    "Recommend the next move using the advise tool.",
  ].join(" ");
}
