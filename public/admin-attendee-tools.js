(() => {
  if (!location.pathname.startsWith('/admin/attendees')) return;
  const people = document.querySelector('#people');
  if (!people) return;

  const state = { templates: null };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function modalShell(id, title, subtitle, body, actions) {
    document.querySelector(`#${id}`)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.className = 'attendee-tool-overlay';
    el.innerHTML = `<div class="attendee-tool-backdrop"></div><section class="attendee-tool-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}-title"><button class="attendee-tool-close" type="button" aria-label="Close">×</button><div class="attendee-tool-head"><span class="kicker">${escapeHtml(subtitle)}</span><h2 id="${id}-title">${escapeHtml(title)}</h2></div><div class="attendee-tool-body">${body}</div><footer class="attendee-tool-actions">${actions}</footer></section>`;
    document.body.appendChild(el);
    const close = () => { el.remove(); document.body.classList.remove('modal-open'); };
    el.querySelector('.attendee-tool-close').onclick = close;
    el.querySelector('.attendee-tool-backdrop').onclick = close;
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.body.classList.add('modal-open');
    return { el, close };
  }

  async function templates() {
    if (state.templates) return state.templates;
    const r = await fetch('/api/admin/templates');
    if (r.status === 401) { location = '/admin-login'; return []; }
    const d = await r.json();
    state.templates = d.templates || [];
    return state.templates;
  }

  async function sendEmail(card) {
    const id = card.dataset.id;
    const name = card.querySelector('.person-name strong')?.textContent?.trim() || 'Attendee';
    const email = card.querySelector('.person-name small')?.textContent?.trim() || '';
    const list = await templates();
    const body = `<p class="tool-recipient"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(email)}</span></p><label class="tool-field">Email type<select id="tool-email-mode"><option value="template">Use a saved template</option><option value="custom">Write a custom email</option></select></label><div id="tool-template-wrap"><label class="tool-field">Saved template<select id="tool-template">${list.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('')}</select></label><p class="tool-note">The saved template will be personalized with this attendee’s name and latest class information.</p></div><div id="tool-custom-wrap" hidden><label class="tool-field">Subject<input id="tool-subject" placeholder="Email subject"></label><label class="tool-field">Message<textarea id="tool-body" rows="9" placeholder="Write your message…"></textarea></label><p class="tool-note">You can use {{firstName}}, {{classTitle}}, {{schedule}}, {{dateRange}}, {{locationName}}, {{locationAddress}}, {{registrationLink}}, and {{contactEmail}}.</p></div><div id="tool-email-result" class="tool-result" hidden></div>`;
    const m = modalShell('send-attendee-email', `Email ${name}`, 'Direct email', body, '<button class="button outline" type="button" data-close>Cancel</button><button class="button primary" type="button" id="tool-send">Send email</button>');
    const mode = m.el.querySelector('#tool-email-mode'), templateWrap = m.el.querySelector('#tool-template-wrap'), customWrap = m.el.querySelector('#tool-custom-wrap'), result = m.el.querySelector('#tool-email-result'), send = m.el.querySelector('#tool-send');
    const close = () => m.close();
    m.el.querySelector('[data-close]').onclick = close;
    mode.onchange = () => { const custom = mode.value === 'custom'; templateWrap.hidden = custom; customWrap.hidden = !custom; };
    send.onclick = async () => {
      send.disabled = true; send.textContent = 'Sending…'; result.hidden = true;
      const payload = { studentId: id };
      if (mode.value === 'template') payload.templateId = m.el.querySelector('#tool-template').value;
      else { payload.subject = m.el.querySelector('#tool-subject').value.trim(); payload.body = m.el.querySelector('#tool-body').value.trim(); }
      try {
        const r = await fetch('/api/admin/attendees/email', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'The email could not be sent.');
        result.hidden = false; result.className = 'tool-result success'; result.textContent = `Email sent to ${d.recipient}.`;
        send.textContent = 'Sent';
        setTimeout(close, 900);
      } catch (e) { result.hidden = false; result.className = 'tool-result error'; result.textContent = e instanceof Error ? e.message : 'The email could not be sent.'; send.disabled = false; send.textContent = 'Send email'; }
    };
  }

  async function profileLink(card) {
    const id = card.dataset.id;
    const name = card.querySelector('.person-name strong')?.textContent?.trim() || 'this attendee';
    const body = `<div class="tool-callout"><strong>One-time profile update</strong><span>This creates a private link that lets ${escapeHtml(name)} review and update their own information. The link works once and expires after 7 days.</span></div><div id="link-result" class="tool-link-result"><span>Generating secure link…</span></div>`;
    const m = modalShell('profile-link-modal', 'Request a profile update', 'Self-service update', body, '<button class="button outline" type="button" data-close>Close</button><button class="button primary" type="button" id="copy-link" disabled>Copy link</button>');
    m.el.querySelector('[data-close]').onclick = m.close;
    const result = m.el.querySelector('#link-result'), copy = m.el.querySelector('#copy-link');
    try {
      const r = await fetch('/api/admin/attendees/profile-link', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({studentId:id}) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Unable to create the update link.');
      result.innerHTML = `<label class="tool-field">Private update link<input id="generated-link" readonly value="${escapeHtml(d.url)}"></label><p class="tool-note">Send this link directly to the attendee. It cannot be reused after they submit their update.</p>`;
      copy.disabled = false;
      copy.onclick = async () => { try { await navigator.clipboard.writeText(d.url); copy.textContent = 'Copied'; setTimeout(() => copy.textContent = 'Copy link', 1400); } catch { const input = m.el.querySelector('#generated-link'); input.select(); document.execCommand('copy'); copy.textContent = 'Copied'; } };
    } catch (e) { result.innerHTML = `<div class="tool-result error">${escapeHtml(e instanceof Error ? e.message : 'Unable to create the update link.')}</div>`; }
  }

  async function removeAttendee(card) {
    const id = card.dataset.id;
    const name = card.querySelector('.person-name strong')?.textContent?.trim() || 'this attendee';
    const body = `<div class="tool-danger"><strong>Delete ${escapeHtml(name)}?</strong><span>This permanently removes the attendee profile and their registrations from the directory. This cannot be undone.</span></div><label class="tool-confirm"><input id="delete-confirm" type="checkbox"><span>I understand this permanently deletes the record.</span></label><div id="delete-result" class="tool-result" hidden></div>`;
    const m = modalShell('delete-attendee-modal', 'Delete attendee', 'Permanent removal', body, '<button class="button outline" type="button" data-close>Cancel</button><button class="button danger" type="button" id="delete-attendee" disabled>Delete attendee</button>');
    m.el.querySelector('[data-close]').onclick = m.close;
    const confirm = m.el.querySelector('#delete-confirm'), button = m.el.querySelector('#delete-attendee'), result = m.el.querySelector('#delete-result');
    confirm.onchange = () => button.disabled = !confirm.checked;
    button.onclick = async () => {
      button.disabled = true; button.textContent = 'Deleting…';
      try { const r = await fetch('/api/admin/attendees/delete', {method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:id})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Unable to delete attendee.'); card.remove(); m.close(); } catch(e) { result.hidden=false; result.className='tool-result error'; result.textContent=e instanceof Error?e.message:'Unable to delete attendee.'; button.disabled=false; button.textContent='Delete attendee'; };
    };
  }

  function enhance() {
    people.querySelectorAll('.person-card').forEach(card => {
      const actions = card.querySelector('.profile-actions');
      if (!actions || actions.dataset.toolsReady === '1') return;
      actions.dataset.toolsReady = '1';
      const email = document.createElement('button'); email.type='button'; email.className='button soft attendee-tool-email'; email.textContent='Email attendee';
      const link = document.createElement('button'); link.type='button'; link.className='button soft attendee-tool-link'; link.textContent='Request profile update';
      const del = document.createElement('button'); del.type='button'; del.className='button soft attendee-tool-delete'; del.textContent='Delete';
      actions.append(email, link, del);
      email.onclick = e => { e.stopPropagation(); sendEmail(card); };
      link.onclick = e => { e.stopPropagation(); profileLink(card); };
      del.onclick = e => { e.stopPropagation(); removeAttendee(card); };
    });
  }

  const observer = new MutationObserver(enhance);
  observer.observe(people, {childList:true,subtree:true});
  enhance();
})();
