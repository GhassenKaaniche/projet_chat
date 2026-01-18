let lastId = 0;
let polling = null;

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

  let delBtn = "";
  if (m.can_delete && !m.is_deleted) {
    delBtn = ` <button class="btn-del" data-id="${m.id}">supprimer</button>`;
  }

  return `<div class="msg" data-id="${m.id}">
    <strong>${author}</strong>: <span>${content}</span>${delBtn}
  </div>`;
}

function fetchMessages(roomId) {
  $.getJSON(`/api/rooms/${roomId}/messages/?after_id=${lastId}`)
    .done((res) => {
      const msgs = res.messages || [];
      if (msgs.length === 0) return;

      for (const m of msgs) {
        $("#messages").append(renderMessage(m));
        lastId = Math.max(lastId, m.id);
      }

      // scroll en bas
      const box = document.getElementById("messages");
      box.scrollTop = box.scrollHeight;
    });
}

function sendMessage(roomId, content) {
  return $.ajax({
    url: `/api/rooms/${roomId}/messages/`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ content }),
    headers: { "X-CSRFToken": window.CSRF_TOKEN },
  });
}

function deleteMessage(msgId) {
  return $.ajax({
    url: `/api/messages/${msgId}/delete/`,
    method: "POST",
    headers: { "X-CSRFToken": window.CSRF_TOKEN },
  });
}

function startChat(roomId) {
  fetchMessages(roomId);
  polling = setInterval(() => fetchMessages(roomId), 1200);

  $("#sendForm").on("submit", (e) => {
    e.preventDefault();
    const content = ($("#msgInput").val() || "").trim();
    if (!content) return;

    sendMessage(roomId, content)
      .done(() => {
        $("#msgInput").val("");
        fetchMessages(roomId);
      });
  });

  $("#messages").on("click", ".btn-del", function () {
    const id = $(this).data("id");
    deleteMessage(id).done(() => {
      // refresh complet (simple)
      lastId = 0;
      $("#messages").empty();
      fetchMessages(roomId);
    });
  });
}

window.startChat = startChat;
