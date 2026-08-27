import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import ContactDetailPage from "@/app/contacts/[id]/page";
import { server } from "../../mocks/server";
import { api, makeAddress, makeContact } from "../../mocks/handlers";

jest.mock("@/app/contacts/actions", () => ({
  deleteContactAction: jest.fn(async () => ({})),
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function renderPage(contact: ReturnType<typeof makeContact>) {
  server.use(
    http.get(api("/api/v1/contacts/:id"), () => HttpResponse.json(contact)),
  );
  render(await ContactDetailPage({ params: Promise.resolve({ id: "1" }) }));
}

describe("ContactDetailPage addresses", () => {
  it("groups the addresses by type in Home, Work, Other order", async () => {
    await renderPage(
      makeContact({
        addresses: [
          makeAddress({ id: 1, type: "Other", street: "3 Nowhere Rd" }),
          makeAddress({ id: 2, type: "Work", street: "2 Office Way" }),
          makeAddress({ id: 3, type: "Home", street: "1 Market St" }),
        ],
      }),
    );

    const labels = screen
      .getAllByRole("term")
      .map((term) => term.textContent)
      .filter((label) => label?.endsWith(" address"));
    expect(labels).toEqual(["Home address", "Work address", "Other address"]);
    expect(screen.getByText("2 Office Way, San Francisco, CA 94105, USA")).toBeInTheDocument();
    expect(screen.queryByText("Addresses")).not.toBeInTheDocument();
  });

  it("shows a single placeholder row when there are none", async () => {
    await renderPage(makeContact({ addresses: [] }));

    expect(screen.getByText("Addresses")).toBeInTheDocument();
    expect(screen.queryByText(/ address$/)).not.toBeInTheDocument();
  });
});
