export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { prepareDatabase } = await import("./server/db/ready");
  await prepareDatabase();
}
