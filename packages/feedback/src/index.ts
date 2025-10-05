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
