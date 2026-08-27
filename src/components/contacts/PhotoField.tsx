import ContactAvatar from "./ContactAvatar";
import { PHOTO_ACCEPT, PHOTO_MAX_BYTES } from "@/lib/contacts/photo";
import type { Contact } from "@/lib/contacts/types";

const FILE_INPUT =
  "block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-secondary-foreground hover:file:bg-secondary/70";

/**
 * Photo section of the contact form: the current avatar, a file picker, and
 * (when a photo exists) a box to remove it. The file is read by the server
 * action, not here, so this stays a plain form control.
 */
export default function PhotoField({
  contact,
  error,
}: {
  contact?: Pick<Contact, "first_name" | "last_name" | "email" | "photo">;
  error?: string;
}) {
  const id = "field-photo_file";
  const errorId = `${id}-error`;
  const hasPhoto = Boolean(contact?.photo);

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Photo</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Photo
        </h2>
        <p className="text-[13px] text-muted-foreground">
          PNG, JPEG, WebP, or GIF up to {PHOTO_MAX_BYTES / 1000}KB. Without one,
          the contact shows their initials.
        </p>
      </div>

      <div className="flex items-start gap-4">
        {contact ? <ContactAvatar contact={contact} size="lg" /> : null}

        <div className="min-w-0 flex-1 space-y-2">
          <label
            htmlFor={id}
            className="block text-[13px] font-medium text-foreground"
          >
            {hasPhoto ? "Replace photo" : "Upload photo"}
            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
              optional
            </span>
          </label>
          <input
            id={id}
            name="photo_file"
            type="file"
            accept={PHOTO_ACCEPT}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={FILE_INPUT}
          />

          {hasPhoto ? (
            <label className="flex items-center gap-2 text-[13px] text-foreground">
              <input
                type="checkbox"
                name="remove_photo"
                className="h-4 w-4 rounded border-border"
              />
              Remove photo
            </label>
          ) : null}

          {error ? (
            <p id={errorId} role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}
