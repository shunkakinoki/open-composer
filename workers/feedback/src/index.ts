import { LinearClient } from "@linear/sdk";
import { createFeedback } from "@open-composer/feedback";

// Re-export client functions
export { submitFeedback } from "./client.js";

export interface Env {
  FEEDBACK_KV: KVNamespace;
  LINEAR_API_KEY: string;
  LINEAR_TEAM_ID: string;
}

let cachedLinearClient: LinearClient | undefined;

const getLinearClient = (apiKey: string): LinearClient => {
  if (!cachedLinearClient) {
    cachedLinearClient = new LinearClient({ apiKey });
  }
  return cachedLinearClient;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    if (!env.LINEAR_API_KEY || !env.LINEAR_TEAM_ID) {
      console.error("Linear environment variables are not configured");
      return new Response("Service misconfigured", {
        status: 500,
        headers: corsHeaders,
      });
    }

    try {
      const body = (await request.json()) as {
        email?: string;
        message?: string;
      };

      const email = body.email?.trim();
      const message = body.message?.trim();

      if (!email || !message) {
        return new Response("Invalid input: email and message are required", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const feedback = createFeedback(email, message);

      // Store feedback in KV for local storage/backup
      try {
        const existingFeedbacksJson = await env.FEEDBACK_KV.get("feedbacks");
        const existingFeedbacks: (typeof feedback)[] = existingFeedbacksJson
          ? JSON.parse(existingFeedbacksJson)
          : [];
        existingFeedbacks.push(feedback);
        await env.FEEDBACK_KV.put(
          "feedbacks",
          JSON.stringify(existingFeedbacks),
        );
      } catch (kvError) {
        console.error("Error storing feedback in KV:", kvError);
        // Continue even if KV storage fails - Linear issue creation is primary
      }

      const linearClient = getLinearClient(env.LINEAR_API_KEY);

      const normalizedEmail = email.toLowerCase();
      let customerId: string | undefined;

      try {
        const existingCustomers = await linearClient.customers({
          filter: {
            email: { eq: normalizedEmail },
          },
          first: 1,
        });

        customerId = existingCustomers.nodes?.[0]?.id;

        if (!customerId) {
          const customerResult = await linearClient.customerCreate({
            input: {
              email: normalizedEmail,
              name: normalizedEmail,
            },
          });
          customerId = customerResult.customer?.id ?? undefined;
        }
      } catch (customerError) {
        console.error("Error syncing Linear customer:", customerError);
        return new Response("Failed to sync customer", {
          status: 502,
          headers: corsHeaders,
        });
      }

      try {
        const issueResult = await linearClient.issueCreate({
          input: {
            teamId: env.LINEAR_TEAM_ID,
            title: `Feedback from ${email}`,
            description: `**Email:** ${email}\n\n**Message:**\n${message}`,
            customerIds: customerId ? [customerId] : undefined,
          },
        });

        if (!issueResult.success || !issueResult.issue) {
          console.error("Linear issue creation failed", issueResult);
          return new Response("Failed to create Linear issue", {
            status: 502,
            headers: corsHeaders,
          });
        }

        return new Response(
          JSON.stringify({
            feedback,
            linearIssueId: issueResult.issue.id,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          },
        );
      } catch (issueError) {
        console.error("Error creating Linear issue:", issueError);
        return new Response("Failed to create Linear issue", {
          status: 502,
          headers: corsHeaders,
        });
      }
    } catch (error) {
      console.error("Error processing feedback:", error);
      return new Response("Internal server error", {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
