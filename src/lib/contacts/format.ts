import { ADDRESS_TYPES, type Address, type AddressType, type Contact } from "./types";

/** Presentation helpers shared by the list, the detail page, and the cards. */

/** Up to two letters for the avatar bubble. */
export function initials(contact: Pick<Contact, "first_name" | "last_name">) {
  return `${contact.first_name.at(0) ?? ""}${contact.last_name.at(0) ?? ""}`
    .toUpperCase()
    .trim();
}

/**
 * Stable hue per contact so the same person keeps the same avatar colour
 * across renders and machines (no randomness, no hydration mismatch).
 */
export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

// Rendered on the server and hydrated on the client, so pin the locale and zone
// rather than letting each side pick its own and mismatch.
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${TIMESTAMP_FORMAT.format(date)} UTC`;
}

/** "Ada Lovelace · Mathematician at Analytical Engines"-style subtitle. */
export function jobLine(contact: Contact): string | null {
  if (contact.job_title && contact.company) {
    return `${contact.job_title} at ${contact.company}`;
  }
  return contact.job_title ?? contact.company ?? null;
}

/** The pieces of a postal address, in the order they read on an envelope. */
type PostalParts = Pick<Address, "street" | "city" | "state" | "postal_code" | "country">;

/** Single-line postal address, skipping the parts that are not filled in. */
export function postalAddressLine(parts: PostalParts): string | null {
  const filled = [
    parts.street,
    parts.city,
    [parts.state, parts.postal_code].filter(Boolean).join(" "),
    parts.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return filled.length ? filled.join(", ") : null;
}

/** The contact's legacy flat address fields on one line. */
export function addressLine(contact: Contact): string | null {
  return postalAddressLine({ ...contact, street: contact.address });
}

/**
 * Addresses bucketed by type in the fixed Home, Work, Other order, dropping
 * the types the contact has none of, so the detail page can render one row
 * per type without re-sorting.
 */
export function addressesByType(
  addresses: Address[],
): Array<{ type: AddressType; addresses: Address[] }> {
  return ADDRESS_TYPES.map((type) => ({
    type,
    addresses: addresses.filter((address) => address.type === type),
  })).filter((group) => group.addresses.length > 0);
}
