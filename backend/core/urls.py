from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse  # <-- Yeh line add karein

# Ek simple function jo root URL (/) par response dega
def api_root(request):
    return JsonResponse({
        "status": "Optimal",
        "message": "Welcome to Perseus Trader API Terminal. System is Live.",
        "version": "1.0.0"
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Root URL (/) ke liye path
    path('', api_root, name='api_root'), 
    
    # Aapke baaki API URLs yahan honge, jaise:
    # path('api/', include('api.urls')),
]