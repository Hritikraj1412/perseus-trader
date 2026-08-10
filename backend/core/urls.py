from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        "status": "Optimal",
        "message": "Welcome to Perseus Trader API Terminal. System is Live.",
        "version": "1.0.0"
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', api_root, name='api_root'), 
    
    # YEH LINE SABSE ZAROORI HAI - Yeh /api/ ko aapki api app se connect karegi
    path('api/', include('api.urls')), 
]