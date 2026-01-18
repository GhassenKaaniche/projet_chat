import json
from django.http import JsonResponse
from .models import Room, Membership, Message



from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render


@login_required
def room_list(request):
    rooms = Room.objects.all().order_by("name")
    return render(request, "chat/room_list.html", {"rooms": rooms})

@login_required
def room_create(request):
    error = ""
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        if not name:
            error = "Nom requis."
        elif Room.objects.filter(name=name).exists():
            error = "Ce salon existe déjà."
        else:
            room = Room.objects.create(name=name, owner=request.user)
            Membership.objects.create(user=request.user, room=room, role=Membership.ROLE_OWNER)
            return redirect("room_detail", room_id=room.id)

    return render(request, "chat/room_create.html", {"error": error})

@login_required
def room_detail(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    Membership.objects.get_or_create(
        user=request.user,
        room=room,
        defaults={"role": Membership.ROLE_MEMBER},
    )
    return render(request, "chat/room_detail.html", {"room": room})


@login_required
def api_messages(request, room_id):
    room = get_object_or_404(Room, id=room_id)

    # auto-join si besoin (même logique que room_detail)
    Membership.objects.get_or_create(
        user=request.user,
        room=room,
        defaults={"role": Membership.ROLE_MEMBER},
    )

    if request.method == "GET":
        after_id = request.GET.get("after_id")
        qs = Message.objects.filter(room=room)
        if after_id and after_id.isdigit():
            qs = qs.filter(id__gt=int(after_id))
        msgs = qs.order_by("id")[:50]

        data = []
        for m in msgs:
            data.append({
                "id": m.id,
                "author": m.author.username,
                "content": "⛔ message supprimé" if m.is_deleted else m.content,
                "is_deleted": m.is_deleted,
                "can_delete": (m.author_id == request.user.id),  # modération avancée + tard
                "created_at": m.created_at.isoformat(),
            })
        return JsonResponse({"messages": data})

    if request.method == "POST":
        payload = json.loads(request.body.decode("utf-8") or "{}")
        content = (payload.get("content") or "").strip()
        if not content:
            return JsonResponse({"error": "empty"}, status=400)

        msg = Message.objects.create(room=room, author=request.user, content=content[:1000])
        return JsonResponse({"ok": True, "id": msg.id})

    return JsonResponse({"error": "method"}, status=405)


@login_required
def api_delete_message(request, msg_id):
    msg = get_object_or_404(Message, id=msg_id)

    if request.method != "POST":
        return JsonResponse({"error": "method"}, status=405)

    # Pour l’instant: l’auteur peut supprimer son message (modération plus tard)
    if msg.author_id != request.user.id:
        return JsonResponse({"error": "forbidden"}, status=403)

    msg.is_deleted = True
    msg.save(update_fields=["is_deleted"])
    return JsonResponse({"ok": True})
