/*
 * Getting a picture out of the app and into someone's chat.
 *
 * Phones do this with the system share sheet (Web Share API, level 2), which is the one the
 * child expects: Telegram, Instagram, WhatsApp, save to photos. Desktop browsers mostly do not
 * have it, and neither do some in-app browsers, so a download is always kept as the way out.
 */

export type ShareOutcome = 'shared' | 'saved' | 'cancelled';

interface ShareImageInput {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
}

function toFile({ blob, fileName }: Pick<ShareImageInput, 'blob' | 'fileName'>): File {
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

/** Whether this browser can hand a picture to another app at all. */
export function canShareImage(blob: Blob, fileName: string): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [toFile({ blob, fileName })] });
  } catch {
    return false;
  }
}

/** Saves the picture to the device. */
export function saveImage(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking straight away can cancel the download in some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Opens the share sheet, and falls back to saving when there is none. A share the person
 * backs out of is reported as such — it is not an error and must not look like one.
 */
export async function shareImage(input: ShareImageInput): Promise<ShareOutcome> {
  const { blob, fileName, title, text } = input;

  if (canShareImage(blob, fileName)) {
    try {
      await navigator.share({ files: [toFile(input)], title, text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else (a share sheet that refused the file) still leaves the child a picture.
    }
  }

  saveImage(blob, fileName);
  return 'saved';
}
