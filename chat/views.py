from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

from .models import Room, Message


@login_required
def room_list(request):
    rooms = Room.objects.all()
    return render(request, "chat/room_list.html", {
        "rooms": rooms
    })


@login_required
def room_detail(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    messages = Message.objects.filter(room=room).order_by("created_at")

    # AJAX envoi message
    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        content = request.POST.get("content", "").strip()

        if content:
            msg = Message.objects.create(
                room=room,
                user=request.user,
                content=content
            )

            return JsonResponse({
                "success": True,
                "id": msg.id,
                "username": request.user.username,
                "content": msg.content,
                "is_owner": True,
                "time": msg.created_at.strftime("%H:%M")
            })



        return JsonResponse({"success": False})

    return render(request, "chat/room_detail.html", {
        "room": room,
        "messages": messages
    })


@login_required
def room_create(request):
    if request.method == "POST":
        name = request.POST.get("name", "").strip()

        if name:
            room = Room.objects.create(
                name=name,
                owner=request.user
            )
            return redirect("room_detail", room_id=room.id)

    return render(request, "chat/room_create.html")


@login_required
def delete_message(request, message_id):
    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        message = get_object_or_404(Message, id=message_id)

        # Sécurité : seul l'auteur peut supprimer
        if message.user != request.user:
            return JsonResponse({"success": False}, status=403)

        message.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"success": False}, status=400)


@login_required
def api_messages(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    messages = Message.objects.filter(room=room).order_by("created_at")

    return JsonResponse({
        "messages": [
            {
                "id": m.id,
                "user": m.user.username,
                "content": m.content,
            }
            for m in messages
        ]
    })
