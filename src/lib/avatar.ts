export interface AvatarPalette {
  background: string;
  border: string;
  color: string;
}

/**
 * Eight tints that all read clearly on the dark surfaces. Deliberately distinct
 * in hue rather than lightness, so they stay distinguishable at avatar size.
 */
const PALETTE: AvatarPalette[] = [
  { background: "rgba(139, 92, 246, 0.22)", border: "rgba(167, 139, 250, 0.45)", color: "#C4B5FD" },
  { background: "rgba(34, 197, 94, 0.20)", border: "rgba(74, 222, 128, 0.45)", color: "#86EFAC" },
  { background: "rgba(59, 130, 246, 0.22)", border: "rgba(96, 165, 250, 0.45)", color: "#93C5FD" },
  { background: "rgba(251, 191, 36, 0.20)", border: "rgba(252, 211, 77, 0.45)", color: "#FCD34D" },
  { background: "rgba(236, 72, 153, 0.20)", border: "rgba(244, 114, 182, 0.45)", color: "#F9A8D4" },
  { background: "rgba(20, 184, 166, 0.22)", border: "rgba(45, 212, 191, 0.45)", color: "#5EEAD4" },
  { background: "rgba(249, 115, 22, 0.20)", border: "rgba(251, 146, 60, 0.45)", color: "#FDBA74" },
  {
    background: "rgba(129, 140, 248, 0.22)",
    border: "rgba(165, 180, 252, 0.45)",
    color: "#C7D2FE",
  },
];

/** The colour used for the signed-in viewer, so "me" is always recognisable. */
export const VIEWER_PALETTE: AvatarPalette = PALETTE[0];

/**
 * A stable colour per uid.
 *
 * Initials collide — two people called Тэмүүлэн Б. and Türbat Б. both render as
 * "ТБ" — so the colour, not the letters, is what tells them apart. Hashing the
 * uid keeps that colour the same on every screen and every session.
 */
export function avatarPalette(uid: string): AvatarPalette {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
