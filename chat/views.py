from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .models import Room, Membership

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
