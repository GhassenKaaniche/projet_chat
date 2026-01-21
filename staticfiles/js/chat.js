let lastId = 0;
let polling = null;

// ---------- CSRF ----------
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}
function csrfToken() { return getCookie("csrftoken"); }

// ---------- Toast ----------
function showToast(message, variant = "primary") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${variant} border-0`;
  el.setAttribute("role", "alert");
  el.setAttribute("aria-live", "assertive");
  el.setAttribute("aria-atomic", "true");

  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 2200 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

// ---------- Helpers ----------
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMessage(m) {
  const content = escapeHtml(m.content);
  const author = escapeHtml(m.author);
  const isMe = (window.ME_USERNAME && m.author === window.ME_USERNAME);

  let actions = "";
  if (m.can_delete && !m.is_deleted) {
    actions = `<div class="msg-actions">
      <button class="btn-del-icon btn-del" data-id="${m.id}" title="Supprimer">🗑️</button>
    </div>`;
  }

  return `<div class="bubble ${isMe ? "me" : ""}" data-id="${m.id}">
    ${actions}
    <div class="meta">${author}</div>
    <div class="text">${content}</div>
  </div>`;
}

// ---------- API ----------
function fetchMessages(roomId) {
  $.getJSON(`/api/rooms/${roomId}/messages/?after_id=${lastId}`)
    .done((res) => {
      const msgs = res.messages || [];
      if (!msgs.length) return;

      for (const m of msgs) {
        $("#messages").append(renderMessage(m));
        lastId = Math.max(lastId, m.id);
      }

      const box = document.getElementById("messages");
      if (box) box.scrollTop = box.scrollHeight;
    })
    .fail((xhr) => {
      if (xhr.status === 403) {
        clearInterval(polling);
        polling = null;
        showToast("Accès refusé (banni ?) ❌", "danger");
      }
    });
}

function sendMessage(roomId, content) {
  return $.ajax({
    url: `/api/rooms/${roomId}/messages/`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ content }),
    headers: { "X-CSRFToken": csrfToken() },
  });
}

function deleteMessage(msgId) {
  return $.ajax({
    url: `/api/messages/${msgId}/delete/`,
    method: "POST",
    headers: { "X-CSRFToken": csrfToken() },
  });
}

function banUser(roomId, username) {
  return $.ajax({
    url: `/api/rooms/${roomId}/ban/`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ username }),
    headers: { "X-CSRFToken": csrfToken() },
  });
}

function unbanUser(roomId, username) {
  return $.ajax({
    url: `/api/rooms/${roomId}/unban/`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ username }),
    headers: { "X-CSRFToken": csrfToken() },
  });
}

// ---------- Emoji ----------
function insertAtCursor(inputEl, text) {
  const start = inputEl.selectionStart ?? inputEl.value.length;
  const end = inputEl.selectionEnd ?? inputEl.value.length;
  inputEl.value = inputEl.value.slice(0, start) + text + inputEl.value.slice(end);
  const newPos = start + text.length;
  inputEl.setSelectionRange(newPos, newPos);
  inputEl.focus();
}

// ---------- Main ----------
function startChat(roomId) {
  fetchMessages(roomId);
  polling = setInterval(() => fetchMessages(roomId), 1200);

  // ---- Message submit ----
  $("#sendForm").off("submit").on("submit", (e) => {
    e.preventDefault();

    if (window.IS_BANNED) {
      showToast("❌ Vous êtes banni, impossible d'envoyer un message.", "danger");
      return;
    }

    const content = ($("#msgInput").val() || "").trim();
    if (!content) return;

    sendMessage(roomId, content)
      .done(() => {
        $("#msgInput").val("");
        fetchMessages(roomId);
      })
      .fail((xhr) => showToast("Erreur envoi: " + xhr.status, "danger"));
  });

  // ---- Delete message ----
  $("#messages").off("click", ".btn-del").on("click", ".btn-del", function () {
    const id = $(this).data("id");
    deleteMessage(id)
      .done(() => {
        lastId = 0;
        $("#messages").empty();
        fetchMessages(roomId);
        showToast("Message supprimé ✅", "secondary");
      })
      .fail((xhr) => showToast("Erreur suppression: " + xhr.status, "danger"));
  });

  // ---- Ban / Unban ----
  $(document).off("click", "#banBtn").on("click", "#banBtn", () => {
    const username = ($("#banUser").val() || "").trim();
    if (!username) return showToast("Username requis", "secondary");

    banUser(roomId, username)
      .done(() => showToast("Utilisateur banni ✅", "warning"))
      .fail((xhr) => showToast("Erreur ban: " + xhr.status, "danger"));
  });

  $(document).off("click", "#unbanBtn").on("click", "#unbanBtn", () => {
    const username = ($("#unbanUser").val() || "").trim();
    if (!username) return showToast("Username requis", "secondary");

    unbanUser(roomId, username)
      .done(() => showToast("Utilisateur débanni ✅", "success"))
      .fail((xhr) => showToast("Erreur unban: " + xhr.status, "danger"));
  });

  // ---- Emojis ----
  $(document).off("click", "#emojiBtn").on("click", "#emojiBtn", () => {
    $("#emojiPicker").toggle();
  });

  $(document).off("click", "#emojiPicker .emoji").on("click", "#emojiPicker .emoji", function () {
    const emoji = $(this).text();
    const input = document.getElementById("msgInput");
    if (!input) return;
    insertAtCursor(input, emoji);
  });

  // ---- Close emoji picker if click outside ----
  $(document).off("click.chat").on("click.chat", (e) => {
    const picker = document.getElementById("emojiPicker");
    const btn = document.getElementById("emojiBtn");
    if (!picker || !btn) return;

    if (!picker.contains(e.target) && !btn.contains(e.target)) {
      $("#emojiPicker").hide();
    }
  });

  // ---- Show banned toast ----
  if (window.IS_BANNED) {
    showToast("⚠️ Vous êtes banni dans ce salon, vous ne pouvez rien écrire.", "danger");
  }
}

window.startChat = startChat;
