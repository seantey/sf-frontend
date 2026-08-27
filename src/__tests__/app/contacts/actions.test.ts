import { http, HttpResponse } from "msw";
import { saveContactAction } from "@/app/contacts/actions";
import { EMPTY_FORM_STATE, type ContactWrite } from "@/lib/contacts/types";
import { server } from "../../mocks/server";
import { api, makeAddress, makeContact } from "../../mocks/handlers";

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
  return formData;
}

describe("saveContactAction", () => {
  it("carries the contact's existing addresses through the PUT", async () => {
    let putBody: ContactWrite | undefined;
    server.use(
      http.get(api("/api/v1/contacts/:id"), () =>
        HttpResponse.json(
          makeContact({
            addresses: [
              makeAddress({ id: 7, type: "Home" }),
              makeAddress({ id: 8, type: "Work", street: "2 Office Way" }),
            ],
          }),
        ),
      ),
      http.put(api("/api/v1/contacts/:id"), async ({ request }) => {
        putBody = (await request.json()) as ContactWrite;
        return HttpResponse.json(makeContact());
      }),
    );

    await expect(
      saveContactAction(1, EMPTY_FORM_STATE, validForm()),
    ).rejects.toThrow("redirect:/contacts/1");

    expect(putBody?.addresses).toEqual([
      expect.objectContaining({ type: "Home", street: "1 Market St" }),
      expect.objectContaining({ type: "Work", street: "2 Office Way" }),
    ]);
    expect(putBody?.addresses.some((address) => "id" in address)).toBe(false);
  });

  it("reports a contact that vanished before the save", async () => {
    await expect(
      saveContactAction(4242, EMPTY_FORM_STATE, validForm()),
    ).resolves.toMatchObject({
      status: "error",
      message: "That contact has already been deleted.",
    });
  });

  it("creates with an empty address list", async () => {
    let postBody: ContactWrite | undefined;
    server.use(
      http.post(api("/api/v1/contacts"), async ({ request }) => {
        postBody = (await request.json()) as ContactWrite;
        return HttpResponse.json(makeContact({ id: 99 }), { status: 201 });
      }),
    );

    await expect(
      saveContactAction(null, EMPTY_FORM_STATE, validForm()),
    ).rejects.toThrow("redirect:/contacts/99");
    expect(postBody?.addresses).toEqual([]);
  });
});
