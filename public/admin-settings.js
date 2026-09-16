(() => {
  function init() {
    const root = document.querySelector('#admin-root');
    if (!root || document.querySelector('#admin-password-settings')) return;

    const section = document.createElement('section');
    section.id = 'admin-password-settings';
    section.className = 'admin-section admin-password-settings';
    section.innerHTML = `
      <div class="admin-section-title">
        <div>
          <p class="eyebrow">Security</p>
          <h2>Admin password</h2>
          <p>Change the password used to sign in to this administration area.</p>
        </div>
        <span class="status-pill">Protected</span>
      </div>
      <form class="admin-form" id="admin-password-form">
        <div class="form-grid">
          <label>Current password<input name="currentPassword" type="password" autocomplete="current-password" required /></label>
          <label>New password<input name="newPassword" type="password" autocomplete="new-password" minlength="12" required /><small class="field-note">Use at least 12 characters.</small></label>
        </div>
        <label>Confirm new password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" required /></label>
        <div class="actions left"><button class="button primary" type="submit">Change admin password</button></div>
        <p class="field-note" id="admin-password-result"></p>
      </form>
    `;

    const nav = root.querySelector('.admin-menu');
    if (nav) {
      const link = document.createElement('a');
      link.href = '#admin-password-settings';
      link.textContent = 'Security';
      nav.appendChild(link);
    }
    root.appendChild(section);

    const form = section.querySelector('#admin-password-form');
    const result = section.querySelector('#admin-password-result');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      result.textContent = 'Saving…';
      try {
        const response = await fetch('/api/admin/password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to change the password.');
        form.reset();
        result.textContent = 'Password changed successfully.';
      } catch (error) {
        result.textContent = error instanceof Error ? error.message : 'Unable to change the password.';
      } finally {
        button.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
