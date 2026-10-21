// Phoenix Plus: what this server has, what Plus adds, and where to get it.

export function PlusPage({ data }) {
  const plus = data.plus;
  return (
    <>
      <section className={`plus-hero${plus.active ? " active" : ""}`}>
        <div>
          <span className="plus-badge big">Plus</span>
          <h3>{plus.active ? "This server has Phoenix Plus" : "Give this server more room"}</h3>
          <p>
            {plus.active
              ? "Thanks for supporting Phoenix! Every limit below is raised for this server for as long as the subscription is active."
              : "Phoenix Plus is a server subscription through Discord. It raises the limits below, and helps keep Phoenix running."}
          </p>
        </div>
        {!plus.active && <a className="button primary" href={plus.storeUrl} target="_blank" rel="noreferrer">Get Phoenix Plus</a>}
      </section>

      <section className="panel">
        <h3>Limits</h3>
        <div className="table-wrap">
          <table className="table plus-table">
            <thead>
              <tr><th>Feature</th><th>This server</th><th className="num">Free</th><th className="num">With Plus</th></tr>
            </thead>
            <tbody>
              {plus.limits.map((l) => {
                const limit = plus.active ? l.premium : l.free;
                const percent = Math.min(100, Math.round((l.used / limit) * 100));
                return (
                  <tr key={l.key} className={l.used >= limit ? "full" : undefined}>
                    <td>{l.label}</td>
                    <td>
                      <div className="plus-usage">
                        <div className="plus-bar" role="progressbar" aria-valuenow={l.used} aria-valuemin={0} aria-valuemax={limit} aria-label={`${l.label} used`}>
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <span>{l.used} / {limit}</span>
                      </div>
                    </td>
                    <td className="num">{l.free}</td>
                    <td className="num plus-col">{l.premium}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="field-help">Plus is bought for a server in Discord, by anyone in it. Use /plus status in the server to check it.</p>
      </section>
    </>
  );
}
