import React from "react";
import { render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";

describe("ContactAvatar", () => {
  it("shows initials when there is no photo", () => {
    const { container } = render(<ContactAvatar contact={makeContact()} />);

    expect(container.textContent).toBe("AL");
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the photo as a circle when there is one", () => {
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo: PHOTO })} size="lg" />,
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", PHOTO);
    expect(image).toHaveClass("rounded-full", "object-cover", "h-14", "w-14");
    expect(screen.queryByText("AL")).toBeNull();
  });
});
