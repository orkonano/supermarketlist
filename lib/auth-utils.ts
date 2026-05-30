export function buildInviteLink(base: string, token?: string): string {
  return token ? `${base}?inviteToken=${encodeURIComponent(token)}` : base;
}
