import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ChannelSelect, RoleSelect } from "../components/fields.jsx";
import { SaveBar } from "../components/SaveBar.jsx";
import { useToast } from "../components/Toasts.jsx";
import { useUnsavedWarning } from "../components/SectionForm.jsx";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function PostMenu({ data, menu, disabled }) {
  const toast = useToast();
  const [channelId, setChannelId] = useState(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    setBusy(true);
    try {
      await api.post(`/guilds/${data.guild.id}/rolemenus/${menu.id}/post`, { channelId, content });
      toast(`Posted ${menu.name}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <footer>
      <div className="panel" style={{ margin: 0, padding: 0, border: 0, background: "none" }}>
        <div className="row">
          <div>
            <label htmlFor={`post-${menu.id}`}>Post to channel</label>
            <ChannelSelect id={`post-${menu.id}`} field={{ channelTypes: [0, 5], required: true }} value={channelId} onChange={setChannelId} data={data} />
          </div>
          <div>
            <label htmlFor={`text-${menu.id}`}>Message (optional)</label>
            <input id={`text-${menu.id}`} className="input" maxLength={2000} placeholder={`Pick your roles from ${menu.name} below.`} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <button type="button" className="button" disabled={disabled || !channelId || busy} onClick={post}>
            {busy ? "Posting..." : "Post menu"}
          </button>
        </div>
        {disabled && <p className="field-help">Save your changes before posting this menu.</p>}
      </div>
    </footer>
  );
}

export function RoleMenus({ data, onSaved }) {
  const toast = useToast();
  const [draft, setDraft] = useState(data.roleMenus);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(data.roleMenus), [data.roleMenus]);
  const dirty = !same(draft, data.roleMenus);
  useUnsavedWarning(dirty);

  const updateMenu = (index, changes) => setDraft((menus) => menus.map((m, i) => (i === index ? { ...m, ...changes } : m)));

  async function save() {
    setSaving(true);
    try {
      const result = await api.put(`/guilds/${data.guild.id}/rolemenus`, { roleMenus: draft });
      onSaved(result.roleMenus);
      toast("Role menus saved.");
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setSaving(false);
    }
  }

  const savedIds = new Set(data.roleMenus.map((m) => m.id));

  return (
    <>
      {draft.length === 0 && <div className="notice">No role menus yet. Make one, add roles to it, save, then post it in a channel.</div>}
      {draft.map((menu, index) => {
        const unsaved = !savedIds.has(menu.id) || !same(menu, data.roleMenus.find((m) => m.id === menu.id));
        return (
          <article className="menu-card" key={menu.id ?? `new-${index}`}>
            <header>
              <label className="visually-hidden" htmlFor={`menu-name-${index}`}>Menu name</label>
              <input id={`menu-name-${index}`} className="input" maxLength={50} value={menu.name} onChange={(e) => updateMenu(index, { name: e.target.value })} />
              <select className="select" style={{ width: "auto" }} aria-label="How many roles people can pick" value={menu.menutype} onChange={(e) => updateMenu(index, { menutype: e.target.value })}>
                <option value="one">Pick one role</option>
                <option value="multi">Pick any number</option>
              </select>
              <button type="button" className="button danger small" onClick={() => setDraft((menus) => menus.filter((_, i) => i !== index))}>Delete menu</button>
            </header>
            <div className="body">
              {menu.roles.length === 0 && <p className="empty-hint">Add the roles people can pick.</p>}
              {menu.roles.map((item, roleIndex) => (
                <div className="menu-role" key={roleIndex}>
                  <input
                    className="input"
                    aria-label="Emoji"
                    value={item.emoji ?? ""}
                    placeholder="⭐"
                    onChange={(e) => updateMenu(index, { roles: menu.roles.map((r, i) => (i === roleIndex ? { ...r, emoji: e.target.value } : r)) })}
                  />
                  <RoleSelect
                    field={{ assignable: true, required: true }}
                    value={item.role}
                    data={data}
                    exclude={menu.roles.map((r) => r.role)}
                    onChange={(role) => updateMenu(index, { roles: menu.roles.map((r, i) => (i === roleIndex ? { ...r, role } : r)) })}
                  />
                  <button type="button" className="icon-button" aria-label="Remove role" onClick={() => updateMenu(index, { roles: menu.roles.filter((_, i) => i !== roleIndex) })}>✕</button>
                </div>
              ))}
              {menu.roles.length < data.limits.roleMenuRoles && (
                <button type="button" className="button small" onClick={() => updateMenu(index, { roles: [...menu.roles, { emoji: "⭐", role: null }] })}>Add role</button>
              )}
            </div>
            {menu.id && <PostMenu data={data} menu={menu} disabled={unsaved} />}
          </article>
        );
      })}
      {draft.length < data.limits.roleMenus ? (
        <button type="button" className="button" onClick={() => setDraft((menus) => [...menus, { name: `Roles ${menus.length + 1}`, menutype: "one", roles: [] }])}>
          New role menu
        </button>
      ) : (
        <p className="field-help">
          This server can have {data.limits.roleMenus} role menus.{data.premium ? "" : " Phoenix Plus raises the limit."}
        </p>
      )}
      {dirty && <SaveBar saving={saving} onSave={save} onReset={() => setDraft(data.roleMenus)} />}
    </>
  );
}
