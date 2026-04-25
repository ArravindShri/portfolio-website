export default function SectionTag({ num, label, path }) {
  return (
    <div className="section-tag">
      <span className="num">§ {num}</span>
      <span>{label}</span>
      <span className="spacer"></span>
      <span className="desc">{path}</span>
    </div>
  );
}
