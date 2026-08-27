import { http, HttpResponse } from "msw";
import { saveContactAction } from "@/app/contacts/actions";
import { addressFieldName } from "@/lib/contacts/schema";
import { EMPTY_FORM_STATE, type ContactWrite } from "@/lib/contacts/types";
import { server } from "../../mocks/server";
import { api, makeContact } from "../../mocks/handlers";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function validForm(): FormData {
  const formData = new FormData();
  formData.set("first_name", "Ada");
  formData.set("last_name", "Lovelace");
  formData.set("email", "ada@example.com");
  formData.set(addressFieldName(0, "type"), "Work");
  formData.set(addressFieldName(0, "street"), "2 Office Way");
  formData.set(addressFieldName(0, "city"), "San Francisco");
  // The spare row the form always renders: type selected, nothing typed.
  formData.set(addressFieldName(1, "type"), "Home");
  formData.set(addressFieldName(1, "street"), "");
  return formData;
}

describe("saveContactAction", () => {
  it("sends the form's address rows as the full list on PUT, dropping blanks", async () => {
    let putBody: ContactWrite | undefined;
    server.use(
      http.put(api("/api/v1/contacts/:id"), async ({ request }) => {
        putBody = (await request.json()) as ContactWrite;
        return HttpResponse.json(makeContact());
      }),
    );

    await expect(
      saveContactAction(1, EMPTY_FORM_STATE, validForm()),
    ).rejects.toThrow("redirect:/contacts/1");

    expect(putBody?.addresses).toEqual([
      {
        type: "Work",
        street: "2 Office Way",
        city: "San Francisco",
        state: null,
        postal_code: null,
        country: null,
      },
    ]);
  });

  it("echoes the address rows back when the save fails", async () => {
    server.use(
      http.put(api("/api/v1/contacts/:id"), () =>
        HttpResponse.json({ detail: "Contact 1 not found" }, { status: 404 }),
      ),
    );

    await expect(
      saveContactAction(1, EMPTY_FORM_STATE, validForm()),
    ).resolves.toMatchObject({
      status: "error",
      message: "That contact has already been deleted.",
      addresses: [expect.objectContaining({ street: "2 Office Way" })],
    });
  });

  it("rejects an address field over the API's limit", async () => {
    const formData = validForm();
    formData.set(addressFieldName(0, "postal_code"), "9".repeat(21));

    await expect(
      saveContactAction(null, EMPTY_FORM_STATE, formData),
    ).resolves.toMatchObject({
      status: "error",
      message: "Postal code must be 20 characters or fewer",
    });
  });
});
