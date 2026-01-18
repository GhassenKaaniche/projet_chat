document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const messagesDiv = document.getElementById("messages");
    const input = form.querySelector("input[name='content']");

    console.log("frontend-js chargé ✅");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const message = input.value.trim();
        if (!message) return;

        fetch("", {
            method: "POST",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "content=" + encodeURIComponent(message)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const p = document.createElement("p");
                p.innerHTML = `<strong>${data.username}</strong> : ${data.content}`;
                messagesDiv.appendChild(p);
                input.value = "";
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        });
    });
});

document.addEventListener("click", function (e) {
    if (e.target.classList.contains("delete-btn")) {
        const messageId = e.target.dataset.id;

        fetch(`/messages/${messageId}/delete/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                "X-Requested-With": "XMLHttpRequest"
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                e.target.parentElement.remove();
            }
        });
    }
});
