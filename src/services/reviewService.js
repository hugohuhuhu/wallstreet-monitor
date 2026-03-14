import { listReviewQueue } from "../db/database.js";

export function getReviewQueue(db, { status = "pending", limit = 50 } = {}) {
  return listReviewQueue(db, { status, limit });
}
