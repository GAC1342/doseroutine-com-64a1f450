import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelatedCompounds } from "@/components/related-compounds";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...(actual as object),
    Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <a {...props}>{children}</a>
    ),
  };
});

const sample = [
  {
    slug: "magnesium-glycinate",
    name: "Magnesium Glycinate",
    blurb: "Gentle, well-absorbed magnesium for sleep and muscle recovery.",
  },
  {
    slug: "vitamin-d3-k2",
    name: "Vitamin D3 + K2",
    blurb: "Bone and cardiovascular support when deficient.",
  },
];

describe("RelatedCompounds", () => {
  it("renders nothing when compounds is undefined", () => {
    const { container } = render(<RelatedCompounds compounds={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when compounds is an empty array", () => {
    const { container } = render(<RelatedCompounds compounds={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the heading, description, and compound cards when populated", () => {
    render(
      <RelatedCompounds
        compounds={sample}
        heading="Related compounds"
        description="Evidence, dosing, and interactions for each."
      />,
    );

    expect(screen.getByText("Related compounds")).toBeInTheDocument();
    expect(screen.getByText("Evidence, dosing, and interactions for each.")).toBeInTheDocument();
    expect(screen.getByText("Magnesium Glycinate")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D3 + K2")).toBeInTheDocument();
  });

  it("uses the default heading when none is provided", () => {
    render(<RelatedCompounds compounds={sample} />);
    expect(screen.getByText("Related compounds")).toBeInTheDocument();
  });
});
