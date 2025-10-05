export interface Feedback {
  id: string;
  email: string;
  message: string;
  createdAt: string;
}

export function createFeedback(email: string, message: string): Feedback {
  const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const feedback: Feedback = {
    id,
    email,
    message,
    createdAt: new Date().toISOString(),
  };
  return feedback;
}

export function validateFeedback(feedback: Feedback): boolean {
  return !!(feedback.email && feedback.message && feedback.id);
}

export async function submitFeedback(
  email: string,
  message: string,
): Promise<Feedback> {
  const workerUrl = process.env.FEEDBACK_WORKER_URL || "http://localhost:8787";

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, message }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit feedback: ${response.statusText}`);
  }

  const data = await response.json() as { feedback: Feedback; linearIssueId: string };
  return data.feedback;
}
