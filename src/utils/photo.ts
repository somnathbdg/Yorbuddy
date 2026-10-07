/**
 * Safe profile-photo helper.
 * Returns the photo URL when present, otherwise a clean inline SVG avatar.
 * Prevents broken-image rendering for users without a profile photo.
 */

const FALLBACK_AVATAR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWVhNWIxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LTIgYTYgNiAwIDAgMC02LTZIOGEgNiAIDAgMCAwLTYgMnYyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+';

export function getPhotoUrl(photoUrl: string | null | undefined): string {
  return photoUrl || FALLBACK_AVATAR;
}

export function getPhotoUrls(photos: (string | null | undefined)[]): string[] {
  return photos.map((p) => getPhotoUrl(p));
}
