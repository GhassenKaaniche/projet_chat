document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("chat-form");
    const messagesDiv = document.getElementById("messages");
    const input = form.querySelector("input[name='content']");
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

    // ENVOI MESSAGE
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const message = input.value.trim();
        if (!message) return;

        fetch("", {
            method: "POST",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": csrfToken,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "content=" + encodeURIComponent(message)
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;

            const emptyMsg = document.getElementById("empty-msg");
            if (emptyMsg) emptyMsg.remove();

            const wrapper = document.createElement("div");

            // ALIGNEMENT
            wrapper.className = data.is_owner ? "flex justify-end" : "flex justify-start";

            wrapper.innerHTML = `
            <div class="max-w-[70%] px-4 py-3 rounded-2xl shadow
                ${data.is_owner ? "bg-indigo-600 text-white" : "bg-white border"}">

                <p class="text-xs font-semibold mb-1 opacity-80">
                ${data.username}
                </p>

                <p class="text-sm">${data.content}</p>

                ${data.is_owner ? `
                <button
                    class="delete-btn text-xs mt-2 text-red-200 hover:text-red-400"
                    data-id="${data.id}">
                    Supprimer
                </button>
                ` : ""}
            </div>
            `;
            wrapper.classList.add("message-animate");


            messagesDiv.appendChild(wrapper);
            input.value = "";
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });

    });
    <p class="text-xs opacity-70 mt-1">${data.time}</p>


    // SUPPRESSION MESSAGE
    document.addEventListener("click", function (e) {
        if (e.target.classList.contains("delete-btn")) {
            const id = e.target.dataset.id;

            fetch(`/messages/${id}/delete/`, {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrfToken,
                    "X-Requested-With": "XMLHttpRequest"
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    e.target.closest("div.text-right, div").remove();

                    // Si plus aucun message → afficher placeholder
                    if (messagesDiv.children.length === 0) {
                        messagesDiv.innerHTML = `
                          <p id="empty-msg" class="text-center text-gray-400">
                            Aucun message pour l’instant
                          </p>
                        `;
                    }
                }
            });
        }
    });
});
    