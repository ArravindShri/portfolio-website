export default function MockCard({ m }) {
  return (
    <a
      className="mock"
      href={m.href}
      target="_blank"
      rel="noopener noreferrer"
      data-screen-label={`Mock ${m.num}`}
    >
      <div className="num">MOCK · {m.num}</div>
      <div className="title">{m.title}</div>
      <div className="desc">{m.desc}</div>
      <div className="tools">{m.tools}</div>
      <div className="gh">↗ View on GitHub</div>
    </a>
  );
}
