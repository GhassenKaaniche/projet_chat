from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect


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

    # 🔹 AJAX POST
    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        content = request.POST.get("content", "").strip()

        if content:
            message = Message.objects.create(
                room=room,
                user=request.user,
                content=content
            )

            return JsonResponse({
                "success": True,
                "username": request.user.username,
                "content": message.content
            })

        return JsonResponse({"success": False})

    # 🔹 GET normal
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
        message = get_object_or_404(Message, id=message_id, user=request.user)
        message.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"success": False}, status=400)
