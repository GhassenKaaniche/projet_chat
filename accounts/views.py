from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import redirect, render

def signup(request):
    error = ""
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        if not username or not password:
            error = "Username et mot de passe requis."
        elif User.objects.filter(username=username).exists():
            error = "Ce username existe déjà."
        else:
            user = User.objects.create_user(username=username, password=password)
            login(request, user)
            return redirect("room_list")
    return render(request, "accounts/signup.html", {"error": error})

def login_view(request):
    error = ""
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect("room_list")
        error = "Identifiants invalides."
    return render(request, "accounts/login.html", {"error": error})

@login_required
def logout_view(request):
    logout(request)
    return redirect("login")
