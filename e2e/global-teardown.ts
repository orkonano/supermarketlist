export default async function globalTeardown() {
  const container = (globalThis as any).__DB_CONTAINER__;
  if (container) await container.stop();
}
