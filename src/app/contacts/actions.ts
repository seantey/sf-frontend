"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, ApiUnreachableError } from "@/lib/apiClient";
import {
  apiErrorMessage,
  createContact,
  deleteContact,
  getContact,
  replaceContact,
  toFieldErrors,
} from "@/lib/contacts/api";
import { fileToPhotoDataUrl } from "@/lib/contacts/photo";
import {
  addressInputSchema,
  contactInputSchema,
  formDataToAddresses,
  formDataToValues,
  isBlankAddress,
  zodFieldErrors,
} from "@/lib/contacts/schema";
import type { Contact, FormState } from "@/lib/contacts/types";

/** Mutations for the contacts UI. Every one of these runs only on the server. */

function invalidate(contactId?: number) {
  revalidatePath("/contacts");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

const UNREACHABLE =
  "Could not reach the Contacts API. Check that the backend is running.";

const DELETED = "That contact has already been deleted.";

type ResolvedPhoto = { photo: string | null } | { error: string };

const PHOTO_RESET_NOTE =
  "Choose the photo again: browsers clear a file choice when the form is shown again.";

/**
 * React resets uncontrolled inputs when a form action returns, and a file
 * input cannot be refilled by code. So when a submit fails after the user
 * chose a photo, say so; otherwise the corrected retry would silently save
 * without it.
 */
function withPhotoReminder(formData: FormData, state: FormState): FormState {
  const upload = formData.get("photo_file");
  if (!(upload instanceof File && upload.size > 0) || state.fieldErrors?.photo) {
    return state;
  }
  return {
    ...state,
    fieldErrors: { ...state.fieldErrors, photo: PHOTO_RESET_NOTE },
  };
}

/**
 * Decide which photo the saved contact ends up with. A new upload wins; the
 * "Remove photo" box clears it; otherwise an existing contact keeps what it
 * has. The current photo is re-read from the API instead of being carried in
 * a hidden field: as base64 it can approach the server action body limit.
 */
async function resolvePhoto(
  formData: FormData,
  contactId: number | null,
): Promise<ResolvedPhoto> {
  const upload = formData.get("photo_file");
  if (upload instanceof File && upload.size > 0) {
    return fileToPhotoDataUrl(upload);
  }
  if (contactId === null || formData.get("remove_photo") === "on") {
    return { photo: null };
  }
  const current = await getContact(contactId);
  return { photo: current?.photo ?? null };
}

/**
 * Create (when `contactId` is null) or fully replace a contact.
 *
 * Bind the id at the call site — `saveContactAction.bind(null, contact.id)` —
 * so the form itself never carries a mutable record id.
 */
export async function saveContactAction(
  contactId: number | null,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formDataToValues(formData);
  const addresses = formDataToAddresses(formData).filter(
    (row) => !isBlankAddress(row),
  );
  const fail = (state: FormState): FormState =>
    withPhotoReminder(formData, { ...state, values, addresses });

  let saved: Contact;
  try {
    const photo = await resolvePhoto(formData, contactId);
    if ("error" in photo) {
      return fail({
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { photo: photo.error },
      });
    }

    const parsed = contactInputSchema.safeParse({ ...values, photo: photo.photo });
    if (!parsed.success) {
      return fail({
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: zodFieldErrors(parsed.error),
      });
    }

    const parsedAddresses = addressInputSchema.array().safeParse(addresses);
    if (!parsedAddresses.success) {
      return fail({
        status: "error",
        message: parsedAddresses.error.issues[0].message,
      });
    }

    // The form always submits the full address list, prefilled from the
    // contact, so PUT replacing the list wholesale is what the user sees.
    const body = { ...parsed.data, addresses: parsedAddresses.data };

    saved =
      contactId === null
        ? await createContact(body)
        : await replaceContact(contactId, body);
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return fail({ status: "error", message: UNREACHABLE });
    }
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return fail({ status: "error", message: DELETED });
      }
      if (error.status === 409) {
        return fail({
          status: "error",
          message: "That email address is already taken.",
          fieldErrors: {
            email: apiErrorMessage(error, "This email is already in use."),
          },
        });
      }
      if (error.status === 422) {
        return fail({
          status: "error",
          message: "The API rejected these values.",
          fieldErrors: toFieldErrors(error),
        });
      }
      return fail({
        status: "error",
        message: apiErrorMessage(error, "The contact could not be saved."),
      });
    }
    throw error;
  }

  invalidate(saved.id);
  // Outside the try/catch: redirect() signals by throwing.
  redirect(`/contacts/${saved.id}`);
}

export interface DeleteResult {
  error?: string;
}

/**
 * Delete a contact. Pass `redirectToList` from the detail page, where staying
 * put would leave the user on a 404.
 */
export async function deleteContactAction(
  contactId: number,
  redirectToList = false,
): Promise<DeleteResult> {
  try {
    await deleteContact(contactId);
  } catch (error) {
    if (error instanceof ApiUnreachableError) return { error: UNREACHABLE };
    if (error instanceof ApiError) {
      return {
        error:
          error.status === 404
            ? DELETED
            : apiErrorMessage(error, "The contact could not be deleted."),
      };
    }
    throw error;
  }

  invalidate(contactId);
  if (redirectToList) redirect("/contacts");
  return {};
}
