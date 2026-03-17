import { Link } from "react-router-dom";

const MODES = [
  {
    to: "/standard",
    title: "Standard Stream",
    description:
      "Plain streaming: the entire accumulated text is fed to a single Streamdown component. No block splitting. Simplest approach.",
  },
  {
    to: "/block",
    title: "Block Stream",
    description:
      "Text is split into blocks via parseMarkdownIntoBlocks. Each block rendered with its own StreamdownBlock. No virtualization.",
  },
  {
    to: "/virtualized",
    title: "Virtualized Block Stream",
    description:
      "Same block splitting, but rendered through @tanstack/react-virtual. Only visible blocks are in the DOM.",
  },
];

export function HomePage() {
  return (
    <div className="home-page">
      <p className="home-subtitle">
        Choose a rendering mode to benchmark streaming markdown performance.
      </p>
      <div className="mode-cards">
        {MODES.map((mode) => (
          <Link key={mode.to} to={mode.to} className="mode-card">
            <h2>{mode.title}</h2>
            <p>{mode.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
