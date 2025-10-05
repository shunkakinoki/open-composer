import type { Feedback } from "@open-composer/feedback";

export async function submitFeedback(
  email: string,
  message: string,
): Promise<Feedback> {
  const response = await fetch("http://localhost:8787", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, message }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit feedback: ${response.statusText}`);
  }

  const data = await response.json();
  return data as Feedback;
}
