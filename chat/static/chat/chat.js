document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const messagesDiv = document.getElementById("messages");
    const input = form.querySelector("input[name='content']");
    


    form.addEventListener("submit", function (e) {
        e.preventDefault(); // empêche le rechargement

        const message = input.value.trim();
        if (message === "") return;

        fetch("", {
            method: "POST",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRFToken": getCSRFToken(),
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

    function getCSRFToken() {
        return document.querySelector("[name=csrfmiddlewaretoken]").value;
    }
});
