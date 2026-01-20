from django.contrib import admin
from .models import Room, Membership, Message, Ban

admin.site.register(Room)
admin.site.register(Membership)
admin.site.register(Message)
admin.site.register(Ban)
