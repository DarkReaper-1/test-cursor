import { jsonError } from "@/server/http/errors";

function reject() {
  return jsonError(405, "METHOD_NOT_ALLOWED", "Achievements are derived from training.");
}

export async function POST() {
  return reject();
}

export async function PUT() {
  return reject();
}

export async function PATCH() {
  return reject();
}
