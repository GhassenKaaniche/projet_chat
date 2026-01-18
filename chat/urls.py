from django.urls import path
from . import views

urlpatterns = [
    path("", views.room_list, name="room_list"),
    path("rooms/create/", views.room_create, name="room_create"),
    path("rooms/<int:room_id>/", views.room_detail, name="room_detail"),
    
    path("api/rooms/<int:room_id>/messages/", views.api_messages, name="api_messages"),
    path("api/messages/<int:msg_id>/delete/", views.api_delete_message, name="api_delete_message"),

]
