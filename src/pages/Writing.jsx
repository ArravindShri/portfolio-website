import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import { posts } from '../data/writing.js';

export default function Writing() {
  return (
    <>
      <SEO
        title="Writing"
        description="Case studies, migrations, and notes from shipping production data systems."
        path="/writing"
      />

      <section className="wr-hero section" data-screen-label="Writing Hero">
        <div className="container">
          <div className="cs-eyebrow">
            <span className="bar"></span>
            <span>Current works · what I&rsquo;m building now</span>
          </div>
          <h1>
            What I&rsquo;m <em>currently</em> working on.
          </h1>
          <p className="lede">
            Honest write-ups of the work in progress &mdash; less &ldquo;how to&rdquo;, more
            &ldquo;here is exactly what happened.&rdquo;
          </p>
          <div className="meta-row">
            <div className="meta-cell">
              <div className="k">Published</div>
              <div className="v">
                {posts.length} {posts.length === 1 ? 'piece' : 'pieces'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wr-list section" data-screen-label="Writing Index">
        <div className="container">
          <div className="wr-list-tag">
            <span className="num">§ 00</span>
            <span>Published</span>
            <span className="spacer"></span>
            <span>/ writing / index.json</span>
          </div>

          <div className="wr-grid">
            {posts.map((p) => (
              <Link key={p.idx} className="wr-cardc" to={p.href}>
                <img className="thumb" src={p.thumb} alt="" />
                <div className="cbody">
                  <div className="crow">
                    <span className="cat">{p.cat}</span>
                    <span className="meta">
                      {p.date} · {p.read}
                    </span>
                  </div>
                  <span className="ctitle">
                    {p.title}
                    {p.em && <em>{p.em}</em>}
                  </span>
                  <div className="cfoot">
                    <span className="idx">{p.idx}</span>
                    <span className="read-btn">
                      Read <span className="arrow">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}