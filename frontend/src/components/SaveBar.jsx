export function SaveBar({ saving, onSave, onReset }) {
  return (
    <div className="save-bar" role="region" aria-label="Unsaved changes">
      <p>You have unsaved changes.</p>
      <div className="actions">
        <button type="button" className="button quiet" onClick={onReset} disabled={saving}>Undo changes</button>
        <button type="button" className="button primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
