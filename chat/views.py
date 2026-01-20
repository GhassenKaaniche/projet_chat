import json
from django.http import JsonResponse, HttpResponseForbidden
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .models import Room, Membership, Message, Ban


def is_banned(user, room):
    return Ban.objects.filter(user=user, room=room).exists()


def get_role(user, room):
    m = Membership.objects.filter(user=user, room=room).first()
    return m.role if m else None


def can_moderate(user, room):
    return get_role(user, room) in (Membership.ROLE_OWNER, Membership.ROLE_MOD)


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

    if is_banned(request.user, room):
        return HttpResponseForbidden("Banned from this room.")

    Membership.objects.get_or_create(
        user=request.user,
        room=room,
        defaults={"role": Membership.ROLE_MEMBER},
    )

    return render(request, "chat/room_detail.html", {
        "room": room,
        "can_moderate": can_moderate(request.user, room),
        "me_username": request.user.username,
    })


@login_required
def api_messages(request, room_id):
    room = get_object_or_404(Room, id=room_id)

    if is_banned(request.user, room):
        return JsonResponse({"error": "banned"}, status=403)

    Membership.objects.get_or_create(
        user=request.user,
        room=room,
        defaults={"role": Membership.ROLE_MEMBER},
    )

    if request.method == "GET":
        after_id = request.GET.get("after_id")
        qs = Message.objects.filter(room=room, is_deleted=False)
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
                "can_delete": can_moderate(request.user, room) or (m.author_id == request.user.id),
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

    if not (msg.author_id == request.user.id or can_moderate(request.user, msg.room)):
        return JsonResponse({"error": "forbidden"}, status=403)

    msg.is_deleted = True
    msg.save(update_fields=["is_deleted"])
    return JsonResponse({"ok": True})


@login_required
def api_ban_user(request, room_id):
    room = get_object_or_404(Room, id=room_id)

    if request.method != "POST":
        return JsonResponse({"error": "method"}, status=405)

    if not can_moderate(request.user, room):
        return JsonResponse({"error": "forbidden"}, status=403)

    payload = json.loads(request.body.decode("utf-8") or "{}")
    username = (payload.get("username") or "").strip()
    reason = (payload.get("reason") or "").strip()

    if not username:
        return JsonResponse({"error": "username required"}, status=400)

    target = User.objects.filter(username=username).first()
    if not target:
        return JsonResponse({"error": "user not found"}, status=404)

    if target.id == room.owner_id:
        return JsonResponse({"error": "cannot ban owner"}, status=400)

    if target.id == request.user.id:
        return JsonResponse({"error": "cannot ban yourself"}, status=400)

    Ban.objects.get_or_create(user=target, room=room, defaults={"reason": reason})
    return JsonResponse({"ok": True})


@login_required
def api_unban_user(request, room_id):
    room = get_object_or_404(Room, id=room_id)

    if request.method != "POST":
        return JsonResponse({"error": "method"}, status=405)

    if not can_moderate(request.user, room):
        return JsonResponse({"error": "forbidden"}, status=403)

    payload = json.loads(request.body.decode("utf-8") or "{}")
    username = (payload.get("username") or "").strip()
    if not username:
        return JsonResponse({"error": "username required"}, status=400)

    target = User.objects.filter(username=username).first()
    if not target:
        return JsonResponse({"error": "user not found"}, status=404)

    Ban.objects.filter(user=target, room=room).delete()
    return JsonResponse({"ok": True})
